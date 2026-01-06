"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type WorkflowListItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function WorkflowCard({
  workflow,
  onDeleted,
  onRenamed,
  onDuplicated,
  onExportJson,
}: {
  workflow: WorkflowListItem;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
  onDuplicated: (newWorkflow: WorkflowListItem) => void;
  onExportJson: (id: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(workflow.name);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNameDraft(workflow.name);
  }, [workflow.name]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const lastEdited = useMemo(() => formatDate(workflow.updatedAt), [workflow.updatedAt]);

  const open = useCallback(() => {
    router.push(`/workflows/${workflow.id}`);
  }, [router, workflow.id]);

  const rename = useCallback(async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setRenaming(false);
    setMenuOpen(false);
    await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    onRenamed(workflow.id, trimmed);
  }, [nameDraft, onRenamed, workflow.id]);

  const duplicate = useCallback(async () => {
    setMenuOpen(false);
    const res = await fetch(`/api/workflows/${workflow.id}/duplicate`, { method: "POST" });
    const json = await res.json();
    if (json?.workflow) {
      onDuplicated({
        id: json.workflow.id,
        name: json.workflow.name,
        updatedAt: json.workflow.updatedAt,
        createdAt: json.workflow.createdAt,
      });
    }
  }, [onDuplicated, workflow.id]);

  const del = useCallback(async () => {
    setMenuOpen(false);
    await fetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
    onDeleted(workflow.id);
  }, [onDeleted, workflow.id]);

  const exportJson = useCallback(() => {
    setMenuOpen(false);
    onExportJson(workflow.id);
  }, [onExportJson, workflow.id]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!renaming ? (
            <button
              onClick={open}
              className="text-left font-medium text-white truncate hover:underline"
              title={workflow.name}
            >
              {workflow.name}
            </button>
          ) : (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename();
                if (e.key === "Escape") {
                  setRenaming(false);
                  setNameDraft(workflow.name);
                }
              }}
              className="w-full rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm text-white outline-none"
            />
          )}
          <div className="mt-2 text-xs text-white/60">Last edited {lastEdited}</div>
        </div>

        <button
          className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          onClick={() => setMenuOpen((v) => !v)}
        >
          •••
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-3 top-12 z-20 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#15151c] shadow-xl">
          <MenuItem onClick={open} label="Open" />
          <MenuItem
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
            label="Rename"
          />
          <MenuItem onClick={duplicate} label="Duplicate" />
          <MenuItem onClick={exportJson} label="Export JSON" />
          <div className="h-px bg-white/10" />
          <MenuItem onClick={del} label="Delete" danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full px-3 py-2 text-left text-sm transition",
        danger ? "text-red-300 hover:bg-red-500/10" : "text-white/90 hover:bg-white/5",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

