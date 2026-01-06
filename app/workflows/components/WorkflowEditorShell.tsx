"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
import { nodeTypes } from "./nodes/nodeTypes";
import WeavySidebar from "./sidebar/WeavySidebar";
import type { BaseNodeData } from "./nodes/BaseNode";

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

export default function WorkflowEditorShell({ workflowId }: { workflowId: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("Untitled workflow");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(workflowId);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunStatus, setActiveRunStatus] = useState<string | null>(null);
  const [nodeStatusById, setNodeStatusById] = useState<Record<string, string>>({});

  // `useNodesState<T>()` is generic over the node `data` shape, NOT the Node type itself.
  // Keeping this correct ensures `setNodes([...])` accepts our `{ title, subtitle }` node data.
  const [nodes, setNodes, onNodesChange] = useNodesState<BaseNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const didHydrateRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      // Fit view shortly after state is applied.
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
    // We persist exactly what React Flow expects: nodes + edges JSON.
    // Validate with UI persistence schema (React Flow shape).
    const nodesToPersist = nodes.map((n) => {
      const data = (n.data ?? {}) as any;
      // Never persist runtime-only fields like execution status.
      const { status: _status, ...rest } = data;
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
          // Update URL after creation
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
    // Don't autosave during initial mount/hydration.
    if (!didHydrateRef.current && workflowId) return;
    if (!workflowId && didHydrateRef.current === false) {
      // For /workflows/new, consider hydration "done" after first paint.
      didHydrateRef.current = true;
    }
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

  // Autosave on node/edge changes
  // NOTE: autosave is scheduled from explicit user actions (node/edge changes, connect, add node, import).

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const addNodeAt = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const parsedType = nodeTypeSchema.parse(type);
      const id = `${parsedType}_${Date.now()}`;
      const title =
        parsedType === "prompt" ? "Prompt" : parsedType === "image" ? "Image" : "Run LLM";
      const defaultInput =
        parsedType === "prompt"
          ? { text: "" }
          : parsedType === "image"
            ? { imageBase64: "", mimeType: "image/png" }
            : {
                prompt: "",
                images: [],
                config: { model: "mock-model", temperature: 0.2, providers: ["fal"] },
              };
      setNodes((ns) => [
        ...ns,
        {
          id,
          type: parsedType,
          position,
          data: { title, subtitle: parsedType, input: defaultInput },
        },
      ]);
      scheduleAutosave();
    },
    [scheduleAutosave, setNodes],
  );

  const startRun = useCallback(async () => {
    if (!id) {
      setSaveError("Save the workflow first before running.");
      return;
    }
    setSaveError(null);
    const res = await fetch("/api/workflow/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId: id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSaveError(json?.error ?? "Failed to start run");
      return;
    }
    setActiveRunId(json.workflowRunId);
    setActiveRunStatus("QUEUED");
  }, [id, setSaveError]);

  // Poll execution state and project onto node UI (status pill)
  useEffect(() => {
    if (!activeRunId) return;
    let cancelled = false;
    const tick = async () => {
      const res = await fetch(`/api/workflow/run/${activeRunId}`);
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) return;
      const run = json.run as any;
      setActiveRunStatus(run.status);
      const next: Record<string, string> = {};
      for (const nr of run.nodeRuns ?? []) next[String(nr.nodeId)] = String(nr.status);
      setNodeStatusById(next);
      if (["COMPLETED", "FAILED", "CANCELED"].includes(String(run.status))) {
        // stop polling once terminal
        return;
      }
      setTimeout(tick, 1000);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [activeRunId, setNodes]);

  const nodesWithStatus = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...(n.data as any),
        status: nodeStatusById[n.id] ?? (n.data as any)?.status,
      } as BaseNodeData,
    }));
  }, [nodeStatusById, nodes]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const instance = rfRef.current;
      if (!instance) return;
      // React Flow v11: project screen coords to canvas coords
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
      // Put roughly in center of current view
      const position = instance.project({ x: window.innerWidth / 2 - viewport.x, y: window.innerHeight / 2 - viewport.y });
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
    downloadJson(`${name}.json`, {
      version: 1,
      name,
      nodes,
      edges,
    });
  }, [edges, name, nodes]);

  const statusText = useMemo(() => {
    if (saving) return "Saving…";
    if (lastSavedAt) return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
    return "Not saved yet";
  }, [lastSavedAt, saving]);

  return (
    <div className="flex h-screen w-screen">
      <WeavySidebar projectName={name} onAddNodeCenter={addNodeCenter} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0E0E13] px-4 py-3">
          <div className="min-w-0 flex items-center gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-[320px] max-w-[60vw] rounded-md bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-white outline-none"
            />
            <div className="text-xs text-white/50">{statusText}</div>
            {saveError && <div className="text-xs text-red-300">{saveError}</div>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startRun}
              className="rounded-lg bg-[#FAFFC7] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
              disabled={!id}
              title={!id ? "Save workflow first" : "Run workflow"}
            >
              Run
            </button>
            <button
              onClick={() => void save("manual")}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              Save
            </button>
            {activeRunId && (
              <div className="ml-2 text-xs text-white/60">
                Run: <span className="text-white">{activeRunStatus ?? "…"}</span>
              </div>
            )}
            <button
              onClick={importJson}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              Import
            </button>
            <button
              onClick={exportJson}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              Export
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodesWithStatus}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              scheduleAutosave();
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              scheduleAutosave();
            }}
            onConnect={onConnect}
            onInit={(instance) => {
              rfRef.current = instance;
              instance.fitView({ padding: 0.2 });
            }}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
            className="h-full w-full"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1.3} color="#44424A" />
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              maskColor="rgba(0,0,0,0.6)"
              nodeColor={() => "#1f2937"}
              className="rounded-lg border border-white/10"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

