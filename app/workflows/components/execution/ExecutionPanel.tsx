/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import type { WorkflowRunDetails } from "../../lib/executionOverlay";

type RunListItem = {
  id: string;
  status: string;
  workflowId: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
};

export default function ExecutionPanel({
  selectedRunId,
  selectedRunDetails,
  runsHistory,
  onClose,
  onSelectRun,
  onCancel,
  onFocusNode,
  headerRight,
}: {
  selectedRunId: string | null;
  selectedRunDetails: WorkflowRunDetails | null;
  runsHistory: RunListItem[];
  onClose: () => void;
  onSelectRun: (runId: string | null) => void;
  onCancel: () => void;
  onFocusNode: (nodeId: string) => void;
  headerRight?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"history" | "inspector">("history");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    "ALL" | "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELED"
  >("ALL");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const filteredRuns = useMemo(() => {
    if (historyStatusFilter === "ALL") return runsHistory;
    return runsHistory.filter((r) => r.status === historyStatusFilter);
  }, [historyStatusFilter, runsHistory]);

  const selectedNodeRun = useMemo(() => {
    if (!selectedRunDetails) return null;
    if (selectedNodeId) {
      return selectedRunDetails.nodeRuns.find((n) => n.nodeId === selectedNodeId) ?? null;
    }
    return (
      selectedRunDetails.nodeRuns.find((n) => n.status === "FAILED") ??
      selectedRunDetails.nodeRuns[0] ??
      null
    );
  }, [selectedNodeId, selectedRunDetails]);

  return (
    <div className="w-[360px] h-full min-h-0 border-l border-white/10 bg-[#0E0E13]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0E0E13] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-white">Execution</div>
            <div className="flex items-center gap-2">
              {headerRight}
              {selectedRunId && (
                <button
                  onClick={() => {
                    onClose();
                    setSelectedNodeId(null);
                    setTab("history");
                  }}
                  className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <TabButton active={tab === "history"} onClick={() => setTab("history")} label="History" />
            <TabButton
              active={tab === "inspector"}
              onClick={() => setTab("inspector")}
              label="Inspector"
              disabled={!selectedRunId}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "history" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-white/70">Run history</div>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/80 outline-none"
                >
                  <option value="ALL">All</option>
                  <option value="QUEUED">Queued</option>
                  <option value="RUNNING">Running</option>
                  <option value="WAITING">Waiting</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>

              <div className="mt-3 space-y-2">
                {filteredRuns.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelectRun(r.id);
                      setSelectedNodeId(null);
                      setTab("inspector");
                    }}
                    className={[
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      r.id === selectedRunId
                        ? "border-[#FAFFC7] bg-white/[0.06]"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2">
                        <StatusDot status={r.status} />
                        <span className="text-sm text-white/90">{r.status}</span>
                      </div>
                      <span className="text-xs text-white/40">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {r.error && <div className="mt-2 text-xs text-red-300 line-clamp-2">{r.error}</div>}
                    <div className="mt-2 text-[11px] text-white/40">{r.id}</div>
                  </button>
                ))}
                {filteredRuns.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
                    No runs for this filter yet.
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "inspector" && (
            <>
              {!selectedRunDetails ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
                  Select a run from History to inspect it.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">Run summary</div>
                      {(selectedRunDetails.status === "RUNNING" || selectedRunDetails.status === "WAITING") && (
                        <button
                          onClick={onCancel}
                          className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/15"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/70">
                      <div>Status: <span className="text-white">{selectedRunDetails.status}</span></div>
                      <div>Trigger: <span className="text-white break-all">{selectedRunDetails.triggerRunId ?? "-"}</span></div>
                      <div className="col-span-2">
                        Started:{" "}
                        {selectedRunDetails.startedAt ? new Date(selectedRunDetails.startedAt).toLocaleString() : "-"}
                      </div>
                      <div className="col-span-2">
                        Finished:{" "}
                        {selectedRunDetails.finishedAt ? new Date(selectedRunDetails.finishedAt).toLocaleString() : "-"}
                      </div>
                      {selectedRunDetails.error && <div className="col-span-2 text-red-300">Error: {selectedRunDetails.error}</div>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-sm font-medium text-white">Nodes</div>
                    <div className="mt-3 space-y-2">
                      {selectedRunDetails.nodeRuns.map((nr) => (
                        <button
                          key={nr.nodeId}
                          onClick={() => {
                            setSelectedNodeId(nr.nodeId);
                            onFocusNode(nr.nodeId);
                          }}
                          className={[
                            "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                            nr.nodeId === (selectedNodeRun?.nodeId ?? null)
                              ? "border-[#FAFFC7] bg-white/[0.06]"
                              : "border-white/10 bg-black/20 hover:bg-black/30",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2">
                              <StatusDot status={nr.status} />
                              <span className="text-white/90">{nr.nodeId}</span>
                            </div>
                            <span className="text-white/60">{nr.status}</span>
                          </div>
                          <div className="mt-1 text-white/40">
                            {nr.nodeType} {nr.provider ? `• ${nr.provider}` : ""}
                          </div>
                          {nr.error && <div className="mt-1 text-red-300 line-clamp-2">{nr.error}</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedNodeRun && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-white">Node details</div>
                        <div className="text-xs text-white/60">{selectedNodeRun.nodeId}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/70">
                        <div>Status: <span className="text-white">{selectedNodeRun.status}</span></div>
                        <div>Provider: <span className="text-white">{selectedNodeRun.provider ?? "-"}</span></div>
                      </div>
                      <JsonSection title="Error" tone="danger" value={selectedNodeRun.error} />
                      <JsonSection title="Input" value={selectedNodeRun.input} />
                      <JsonSection title="Output" value={selectedNodeRun.output} />
                      <JsonSection title="Logs" value={selectedNodeRun.logs} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-lg px-3 py-1.5 text-xs transition",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10",
        active ? "bg-white/10 text-white" : "text-white/70",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "RUNNING"
      ? "bg-blue-400"
      : status === "WAITING"
        ? "bg-amber-400"
        : status === "COMPLETED"
          ? "bg-emerald-400"
          : status === "FAILED"
            ? "bg-red-400"
            : status === "CANCELED"
              ? "bg-white/30"
              : "bg-white/20";
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

function JsonSection({
  title,
  value,
  tone,
}: {
  title: string;
  value: unknown;
  tone?: "danger";
}) {
  const textColor = tone === "danger" ? "text-red-200" : "text-white/80";
  return (
    <div className="mt-4">
      <div className="text-xs text-white/60">{title}</div>
      <pre className={`mt-2 max-h-[140px] overflow-auto rounded-lg bg-black/30 p-2 text-[11px] ${textColor}`}>
{JSON.stringify(value ?? null, null, 2)}
      </pre>
    </div>
  );
}

