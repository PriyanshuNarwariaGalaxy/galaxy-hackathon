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
      <div className="text-sm font-medium text-white">{data.title}</div>
      {data.subtitle && <div className="mt-1 text-xs text-white/60">{data.subtitle}</div>}

      <Handle type="target" position={Position.Left} className="!bg-white/60 !border-white/10" />
      <Handle type="source" position={Position.Right} className="!bg-white/60 !border-white/10" />
    </div>
  );
}

export const BaseNode = memo(BaseNodeInner);

