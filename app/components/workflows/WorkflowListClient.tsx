"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WorkflowCard, type WorkflowListItem } from "./WorkflowCard";

type ApiListResponse = { workflows: WorkflowListItem[] };

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WorkflowListClient() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/workflows");
      const json = (await res.json()) as any;
      if (cancelled) return;
      if (!res.ok) {
        setError(json?.error ?? "Failed to load workflows");
        setWorkflows([]);
        setLoading(false);
        return;
      }
      setError(null);
      setWorkflows((json as ApiListResponse).workflows ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDeleted = useCallback((id: string) => {
    setWorkflows((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const onRenamed = useCallback((id: string, name: string) => {
    setWorkflows((ws) => ws.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

  const onDuplicated = useCallback((w: WorkflowListItem) => {
    setWorkflows((ws) => [w, ...ws]);
  }, []);

  const onExportJson = useCallback(async (id: string) => {
    const res = await fetch(`/api/workflows/${id}`);
    const json = await res.json();
    if (!json?.workflow) return;
    downloadJson(`${json.workflow.name}.json`, {
      version: 1,
      name: json.workflow.name,
      nodes: json.workflow.nodes,
      edges: json.workflow.edges,
    });
  }, []);

  const empty = useMemo(() => !loading && workflows.length === 0, [loading, workflows.length]);

  return (
    <div className="h-screen w-screen bg-[#0E0E13] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">Workflows</div>
            <div className="mt-1 text-sm text-white/60">Create, manage, and export workflow graphs.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/workflows/new")}
              className="rounded-lg bg-[#FAFFC7] px-3 py-2 text-sm font-medium text-black hover:opacity-90"
            >
              New workflow
            </button>
          </div>
        </div>

        {loading && <div className="mt-10 text-white/60">Loading…</div>}

        {error && (
          <div className="mt-10 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-red-200">
            {error}
            <div className="mt-2 text-sm text-red-200/70">
              Set <code className="rounded bg-black/30 px-1 py-0.5">DATABASE_URL</code> and run Prisma
              migrations to enable persistence.
            </div>
          </div>
        )}

        {empty && (
          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-white/70">
            No workflows yet. Click <span className="text-white">New workflow</span> to create one.
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {workflows.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              onDeleted={onDeleted}
              onRenamed={onRenamed}
              onDuplicated={onDuplicated}
              onExportJson={onExportJson}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

