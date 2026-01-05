"use client";

import { ReactFlowProvider } from "reactflow";
import CanvasShell from "../components/canvas/CanvasShell";

export default function WorkflowEditorClient() {
  return (
    <div className="flex h-screen w-screen bg-canvas">
      <ReactFlowProvider>
        <CanvasShell />
      </ReactFlowProvider>
    </div>
  );
}
