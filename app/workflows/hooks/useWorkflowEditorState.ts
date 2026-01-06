/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from "reactflow";
import { z } from "zod";

import { nodeTypeSchema } from "@/src/core/nodes/registry";
import { workflowPersistenceSchema } from "@/app/lib/workflow.persistence.schema";
import type { BaseNodeData } from "../components/nodes/BaseNode";

type PersistedWorkflow = {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  updatedAt: string;
};

const importExportSchema = z.object({
  version: z.number(),
  name: z.string(),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
});

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function nowIso() {
  return new Date().toISOString();
}

export function useWorkflowEditorState(workflowId: string | null) {
  const router = useRouter();
  const [name, setName] = useState("Untitled workflow");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(workflowId);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<BaseNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const rfRef = useRef<ReactFlowInstance | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const didHydrateRef = useRef(false);

  // Load workflow by id (if provided)
  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      const json = await res.json();
      if (cancelled) return;
      const wf = json.workflow as PersistedWorkflow | undefined;
      if (!wf) return;

      didHydrateRef.current = false;
      setId(wf.id);
      setName(wf.name);
      setNodes(wf.nodes as any);
      setEdges(wf.edges as any);
      setLastSavedAt(wf.updatedAt);

      requestAnimationFrame(() => {
        rfRef.current?.fitView({ padding: 0.2 });
        didHydrateRef.current = true;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [setEdges, setNodes, workflowId]);

  const buildPersistable = useCallback(() => {
    const nodesToPersist = nodes.map((n) => {
      const data = (n.data ?? {}) as any;
      // Never persist runtime-only fields like execution overlay.
      const { execution: _execution, status: _status, ...rest } = data;
      return { ...n, data: rest };
    });
    workflowPersistenceSchema.parse({ name, nodes: nodesToPersist, edges });
    return { name, nodes: nodesToPersist, edges };
  }, [edges, name, nodes]);

  const save = useCallback(
    async (reason: "autosave" | "manual") => {
      try {
        setSaving(true);
        setSaveError(null);
        const body = buildPersistable();

        if (!id) {
          const res = await fetch("/api/workflows", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          const created = json.workflow as PersistedWorkflow | undefined;
          if (!res.ok) throw new Error(json?.error ?? "Failed to create workflow");
          if (!created) throw new Error("Failed to create workflow");
          setId(created.id);
          setLastSavedAt(created.updatedAt);
          router.replace(`/workflows/${created.id}`);
        } else {
          const res = await fetch(`/api/workflows/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? "Failed to update workflow");
          const updated = json.workflow as PersistedWorkflow | undefined;
          setLastSavedAt(updated?.updatedAt ?? nowIso());
        }
      } finally {
        setSaving(false);
      }
    },
    [buildPersistable, id, router],
  );

  const scheduleAutosave = useCallback(() => {
    if (!didHydrateRef.current && workflowId) return;
    if (!workflowId && didHydrateRef.current === false) didHydrateRef.current = true;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      void save("autosave").catch((e) => setSaveError(e instanceof Error ? e.message : String(e)));
    }, 600);
  }, [save, workflowId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "default" }, eds));
      scheduleAutosave();
    },
    [scheduleAutosave, setEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const addNodeAt = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const parsedType = nodeTypeSchema.parse(type);
      const nodeId = `${parsedType}_${Date.now()}`;
      const title =
        parsedType === "prompt" ? "Prompt" : parsedType === "image" ? "Image" : "Run LLM";
      const defaultInput =
        parsedType === "prompt"
          ? { text: "" }
          : parsedType === "image"
            ? { imageBase64: "", mimeType: "image/png" }
            : { prompt: "", images: [], config: { model: "mock-model", temperature: 0.2, providers: ["fal"] } };

      setNodes((ns) => [
        ...ns,
        { id: nodeId, type: parsedType, position, data: { title, subtitle: parsedType, input: defaultInput } },
      ]);
      scheduleAutosave();
    },
    [scheduleAutosave, setNodes],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const instance = rfRef.current;
      if (!instance) return;
      const bounds = (e.target as HTMLElement).getBoundingClientRect();
      const position = instance.project({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      addNodeAt(type, position);
    },
    [addNodeAt],
  );

  const addNodeCenter = useCallback(
    (type: "prompt" | "image" | "llm") => {
      const instance = rfRef.current;
      if (!instance) return;
      const viewport = instance.getViewport();
      const position = instance.project({
        x: window.innerWidth / 2 - viewport.x,
        y: window.innerHeight / 2 - viewport.y,
      });
      addNodeAt(type, position);
    },
    [addNodeAt],
  );

  const importJson = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = importExportSchema.parse(JSON.parse(text));
      workflowPersistenceSchema.parse({ name: parsed.name, nodes: parsed.nodes, edges: parsed.edges });
      setName(parsed.name);
      setNodes(parsed.nodes as any);
      setEdges(parsed.edges as any);
      requestAnimationFrame(() => rfRef.current?.fitView({ padding: 0.2 }));
      scheduleAutosave();
    };
    input.click();
  }, [scheduleAutosave, setEdges, setNodes]);

  const exportJson = useCallback(() => {
    downloadJson(`${name}.json`, { version: 1, name, nodes, edges });
  }, [edges, name, nodes]);

  const statusText = useMemo(() => {
    if (saving) return "Saving…";
    if (lastSavedAt) return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
    return "Not saved yet";
  }, [lastSavedAt, saving]);

  return {
    id,
    name,
    setName,
    setSaveError,
    statusText,
    saving,
    saveError,
    saveManual: () => save("manual"),
    nodes,
    edges,
    onNodesChange: (changes: any) => {
      onNodesChange(changes);
      scheduleAutosave();
    },
    onEdgesChange: (changes: any) => {
      onEdgesChange(changes);
      scheduleAutosave();
    },
    onConnect,
    onDragOver,
    onDrop,
    addNodeCenter,
    importJson,
    exportJson,
    rfRef,
  };
}

