"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { CheckCircle2, PauseCircle, XCircle } from "lucide-react";

/**
 * UI-only node shell (treat nodes as black-box UI components).
 * This does NOT know about execution. It only renders a card + handles.
 */

export type BaseNodeData = {
  title: string;
  subtitle?: string;
  input?: unknown;
  execution?: {
    status: "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELED";
    provider?: string;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
  };
};

function BaseNodeInner({
  data,
  selected,
}: {
  data: BaseNodeData;
  selected?: boolean;
}) {
  const status = data.execution?.status;
  const border =
    status === "FAILED"
      ? "border-red-500/60"
      : status === "COMPLETED"
        ? "border-emerald-500/60"
        : status === "RUNNING"
          ? "border-blue-500/50"
          : status === "WAITING"
            ? "border-amber-500/50"
            : status === "CANCELED"
              ? "border-white/10 opacity-60"
              : status === "QUEUED"
                ? "border-white/10 opacity-80"
                : "border-white/10";

  const pulse = status === "RUNNING" ? "animate-pulse" : "";

  return (
    <div
      className={[
        "rounded-xl border px-3 py-2 min-w-[190px] bg-[#15151c] shadow-sm",
        selected ? "border-[#FAFFC7]" : border,
        pulse,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-white">{data.title}</div>
        {status && <StatusPill status={status} />}
      </div>
      {data.subtitle && <div className="mt-1 text-xs text-white/60">{data.subtitle}</div>}
      {data.execution?.provider && (
        <div className="mt-2 text-[11px] text-white/50">Provider: {data.execution.provider}</div>
      )}

      <Handle type="target" position={Position.Left} className="!bg-white/60 !border-white/10" />
      <Handle type="source" position={Position.Right} className="!bg-white/60 !border-white/10" />
    </div>
  );
}

export const BaseNode = memo(BaseNodeInner);

function StatusPill({
  status,
}: {
  status: NonNullable<BaseNodeData["execution"]>["status"];
}) {
  const color =
    status === "RUNNING"
      ? "bg-blue-500/15 text-blue-200 border-blue-500/30"
      : status === "WAITING"
        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
      : status === "COMPLETED"
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
        : status === "FAILED"
          ? "bg-red-500/15 text-red-200 border-red-500/30"
          : "bg-white/10 text-white/70 border-white/10";

  const icon =
    status === "COMPLETED" ? (
      <CheckCircle2 size={12} />
    ) : status === "FAILED" ? (
      <XCircle size={12} />
    ) : status === "WAITING" ? (
      <PauseCircle size={12} />
    ) : null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${color}`}>
      {icon}
      {status}
    </span>
  );
}
