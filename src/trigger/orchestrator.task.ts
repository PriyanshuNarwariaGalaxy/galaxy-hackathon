import { logger, task, tasks } from "@trigger.dev/sdk/v3";

import { workflowSchema } from "../core/workflow/workflow.schema";
import { topologicallySortNodeIds } from "../core/workflow/dag";
import { nodeRegistry } from "../core/nodes/registry";

import type { ExecutionContext, ExecutionRun, NodeExecutionResult } from "./execution.types";
import { nodeTask } from "./node.task";

/**
 * Orchestrator task:
 * - validates workflow JSON (Phase 1 schema)
 * - topologically sorts nodes (Phase 1 DAG util)
 * - executes nodes sequentially in dependency order
 * - triggers each node via triggerAndWait (all work happens inside tasks)
 * - accumulates outputs in an execution context keyed by nodeId
 * - logs start/end + per-node details for debugging
 *
 * NOTE: "Input wiring" is intentionally minimal in Phase 2 because the
 * workflow schema does not yet describe port mappings. Today we treat the
 * node's `input` as the literal payload to validate/execute.
 * In a future phase, `buildNodeInput()` can resolve references from context.
 */

export const orchestratorTask = task({
  id: "workflow.orchestrator",
  run: async (payload: { workflow: unknown }, { ctx }) => {
    logger.info("Workflow execution start", {
      task: "workflow.orchestrator",
      runId: ctx.run.id,
    });

    const workflow = workflowSchema.parse(payload.workflow);

    const executionOrder = topologicallySortNodeIds(workflow.nodes, workflow.edges);

    const context: ExecutionContext = { outputsByNodeId: {} };
    const nodeResults: NodeExecutionResult[] = [];
    const startedAt = new Date().toISOString();

    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        // Defensive: topo-sort is built from these nodes, so this should never happen.
        throw new Error(`Internal error: node "${nodeId}" not found in workflow.nodes`);
      }

      const nodeStartedAt = new Date().toISOString();
      logger.info("Node orchestration start", { nodeId, type: node.type, runId: ctx.run.id });

      // "Build input from context" hook (currently passthrough).
      const effectiveInput = buildNodeInput(nodeId, node.input, context);

      // Validate the effective input early for better orchestrator-level errors.
      // Node task will also validate (defense-in-depth).
      nodeRegistry.parseInput(node.type, effectiveInput);

      const result = await tasks.triggerAndWait<typeof nodeTask>(nodeTask.id, {
        nodeId,
        type: node.type,
        input: effectiveInput,
      });

      if (!result.ok) {
        logger.error("Node execution failed", {
          nodeId,
          type: node.type,
          error: result.error,
          runId: ctx.run.id,
        });
        throw new Error(`Node "${nodeId}" (${node.type}) failed`);
      }

      context.outputsByNodeId[nodeId] = result.output;

      const nodeFinishedAt = new Date().toISOString();
      nodeResults.push({
        nodeId,
        type: node.type,
        startedAt: nodeStartedAt,
        finishedAt: nodeFinishedAt,
        input: effectiveInput,
        output: result.output,
      });

      logger.info("Node orchestration complete", {
        nodeId,
        type: node.type,
        output: result.output,
        runId: ctx.run.id,
      });
    }

    const finishedAt = new Date().toISOString();

    const run: ExecutionRun = {
      runId: ctx.run.id,
      status: "completed",
      startedAt,
      finishedAt,
      workflow,
      executionOrder,
      context,
      nodeResults,
    };

    logger.info("Workflow execution complete", {
      runId: ctx.run.id,
      nodeCount: workflow.nodes.length,
      executionOrder,
    });

    return run;
  },
});

function buildNodeInput(nodeId: string, rawInput: unknown, _ctx: ExecutionContext): unknown {
  // Placeholder for future "wiring" support (references, port mappings, etc).
  // Keeping this hook makes Phase 3+ changes localized and testable.
  return rawInput;
}

