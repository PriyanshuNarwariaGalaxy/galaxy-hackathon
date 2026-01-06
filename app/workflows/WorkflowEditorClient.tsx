"use client";

import { ReactFlowProvider } from "reactflow";

import WorkflowEditorShell from "./components/WorkflowEditorShell";

export default function WorkflowEditorClient({ workflowId }: { workflowId: string | null }) {
  return (
    <div className="h-screen w-screen bg-[#0E0E13] text-white">
      <ReactFlowProvider>
        <WorkflowEditorShell workflowId={workflowId} />
      </ReactFlowProvider>
    </div>
  );
}

