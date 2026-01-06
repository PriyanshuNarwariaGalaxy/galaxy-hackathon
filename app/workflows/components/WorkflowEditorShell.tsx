"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap } from "reactflow";

import WeavySidebar from "./sidebar/WeavySidebar";
import { nodeTypes } from "./nodes/nodeTypes";
import type { BaseNodeData } from "./nodes/BaseNode";
import ExecutionPanel from "./execution/ExecutionPanel";
import { useWorkflowEditorState } from "../hooks/useWorkflowEditorState";
import { useExecutionRuns } from "../hooks/useExecutionRuns";

/**
 * Workflow editor shell.
 * - Keeps workflow authoring state and execution overlay state decoupled.
 * - Execution overlay is render-only (never persisted in workflow graph).
 * - File intentionally kept small; heavy logic lives in hooks/components.
 */

export default function WorkflowEditorShell({ workflowId }: { workflowId: string | null }) {
  const editor = useWorkflowEditorState(workflowId);
  const exec = useExecutionRuns(editor.id);

  const nodesWithExecution = useMemo(() => {
    if (!exec.overlay) return editor.nodes;
    return editor.nodes.map((n) => ({
      ...n,
      data: {
        ...(n.data as any),
        execution: exec.overlay?.nodeStates[n.id],
      } as BaseNodeData,
    }));
  }, [editor.nodes, exec.overlay]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const n = editor.nodes.find((x) => x.id === nodeId);
      if (!n || !editor.rfRef.current) return;
      editor.rfRef.current.setCenter(n.position.x, n.position.y, { zoom: 1.2, duration: 300 });
    },
    [editor.nodes, editor.rfRef],
  );

  return (
    <div className="flex h-screen w-screen">
      <WeavySidebar projectName={editor.name} onAddNodeCenter={editor.addNodeCenter} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0E0E13] px-4 py-3">
          <div className="min-w-0 flex items-center gap-3">
            <input
              value={editor.name}
              onChange={(e) => editor.setName(e.target.value)}
              className="w-[320px] max-w-[60vw] rounded-md bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-white outline-none"
            />
            <div className="text-xs text-white/50">{editor.statusText}</div>
            {editor.saveError && <div className="text-xs text-red-300">{editor.saveError}</div>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                exec
                  .startRun()
                  .catch((e) => editor.setSaveError(e instanceof Error ? e.message : String(e)))
              }
              className="rounded-lg bg-[#FAFFC7] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
              disabled={!editor.id}
              title={!editor.id ? "Save workflow first" : "Run workflow"}
            >
              Run
            </button>
            <button
              onClick={editor.saveManual}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              Save
            </button>
            {exec.activeRunDetails && (
              <div className="ml-2 text-xs text-white/60">
                Run: <span className="text-white">{exec.activeRunDetails.status}</span>
              </div>
            )}
            <button
              onClick={editor.importJson}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              Import
            </button>
            <button
              onClick={editor.exportJson}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              Export
            </button>
          </div>
        </div>

        {/* Canvas + Execution Panel */}
        <div className="flex min-w-0 flex-1 min-h-0">
          <div
            className="relative min-w-0 flex-1 min-h-0"
            onDragOver={editor.onDragOver}
            onDrop={editor.onDrop}
          >
            <ReactFlow
              nodes={nodesWithExecution}
              edges={editor.edges}
              nodeTypes={nodeTypes}
              onNodesChange={editor.onNodesChange}
              onEdgesChange={editor.onEdgesChange}
              onConnect={editor.onConnect}
              onInit={(instance) => {
                editor.rfRef.current = instance;
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

          <ExecutionPanel
            selectedRunId={exec.selectedRunId}
            selectedRunDetails={exec.selectedRunDetails}
            runsHistory={exec.runsHistory}
            onClose={() => exec.selectRun(null)}
            onSelectRun={exec.selectRun}
            onCancel={exec.cancelSelectedRun}
            onFocusNode={focusNode}
          />
        </div>
      </div>
    </div>
  );
}

