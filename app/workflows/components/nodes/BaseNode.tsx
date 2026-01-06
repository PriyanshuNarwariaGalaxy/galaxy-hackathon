"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";

/**
 * UI-only node shell (treat nodes as black-box UI components).
 * This does NOT know about execution. It only renders a card + handles.
 */

export type BaseNodeData = {
  title: string;
  subtitle?: string;
  status?: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";
};

function BaseNodeInner({
  data,
  selected,
}: {
  data: BaseNodeData;
  selected?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2 min-w-[190px] bg-[#15151c] shadow-sm",
        selected ? "border-[#FAFFC7]" : "border-white/10",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-white">{data.title}</div>
        {data.status && <StatusPill status={data.status} />}
      </div>
      {data.subtitle && <div className="mt-1 text-xs text-white/60">{data.subtitle}</div>}

      <Handle type="target" position={Position.Left} className="!bg-white/60 !border-white/10" />
      <Handle type="source" position={Position.Right} className="!bg-white/60 !border-white/10" />
    </div>
  );
}

export const BaseNode = memo(BaseNodeInner);

function StatusPill({ status }: { status: NonNullable<BaseNodeData["status"]> }) {
  const color =
    status === "RUNNING"
      ? "bg-blue-500/15 text-blue-200 border-blue-500/30"
      : status === "COMPLETED"
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
        : status === "FAILED"
          ? "bg-red-500/15 text-red-200 border-red-500/30"
          : "bg-white/10 text-white/70 border-white/10";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${color}`}>{status}</span>
  );
}
