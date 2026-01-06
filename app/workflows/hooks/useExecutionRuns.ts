/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  buildExecutionOverlay,
  isTerminal,
  type ExecutionOverlay,
  type WorkflowRunDetails,
} from "../lib/executionOverlay";

type RunListItem = {
  id: string;
  status: string;
  workflowId: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
};

export function useExecutionRuns(workflowId: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunDetails, setActiveRunDetails] = useState<WorkflowRunDetails | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDetails, setSelectedRunDetails] = useState<WorkflowRunDetails | null>(null);

  const [overlay, setOverlay] = useState<ExecutionOverlay | null>(null);
  const [runsHistory, setRunsHistory] = useState<RunListItem[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const selectRun = useCallback(
    (runId: string | null) => {
      setSelectedRunId(runId);
      const next = new URLSearchParams(searchParams.toString());
      if (runId) next.set("runId", runId);
      else next.delete("runId");
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname);
    },
    [pathname, router, searchParams],
  );

  // Initialize selection from URL (?runId=) and treat it as active until proven otherwise.
  useEffect(() => {
    const fromUrl = searchParams.get("runId");
    if (!fromUrl) return;
    setSelectedRunId(fromUrl);
    setActiveRunId(fromUrl);
  }, [searchParams]);

  const startRun = useCallback(async () => {
    if (!workflowId) throw new Error("Workflow must be saved before running.");
    const res = await fetch("/api/workflow/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to start run");
    const runId = String(json.workflowRunId);
    setActiveRunId(runId);
    selectRun(runId);
    setHistoryRefreshKey((k) => k + 1);
    return runId;
  }, [selectRun, workflowId]);

  const cancelSelectedRun = useCallback(async () => {
    if (!selectedRunId) return;
    await fetch(`/api/workflow/run/${selectedRunId}/cancel`, { method: "POST" });
    setHistoryRefreshKey((k) => k + 1);
  }, [selectedRunId]);

  // History
  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/workflow/runs?workflowId=${encodeURIComponent(workflowId)}`);
      const json = await res.json();
      if (cancelled) return;
      setRunsHistory((json?.runs as RunListItem[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [historyRefreshKey, workflowId]);

  // Poll active run every ~2s while non-terminal.
  useEffect(() => {
    if (!activeRunId) return;
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      const res = await fetch(`/api/workflow/run/${activeRunId}`);
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) return;
      const run = json.run as WorkflowRunDetails;
      setActiveRunDetails(run);

      if (selectedRunId === activeRunId) {
        setSelectedRunDetails(run);
        setOverlay(buildExecutionOverlay(run));
      }

      if (!isTerminal(run.status)) {
        timer = window.setTimeout(tick, 2000);
      } else {
        setHistoryRefreshKey((k) => k + 1);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeRunId, selectedRunId]);

  // Fetch selected run once if it isn't the active run (no polling for history).
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRunDetails(null);
      setOverlay(null);
      return;
    }
    if (selectedRunId === activeRunId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/workflow/run/${selectedRunId}`);
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) return;
      const run = json.run as WorkflowRunDetails;
      setSelectedRunDetails(run);
      setOverlay(buildExecutionOverlay(run));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeRunId, selectedRunId]);

  const hasSelection = Boolean(selectedRunId);

  return {
    // active
    activeRunId,
    activeRunDetails,
    // selection
    selectedRunId,
    selectedRunDetails,
    hasSelection,
    // overlay
    overlay,
    // history
    runsHistory,
    refreshHistory: () => setHistoryRefreshKey((k) => k + 1),
    // actions
    selectRun,
    startRun,
    cancelSelectedRun,
  };
}

