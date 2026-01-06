import {
  topologicallySortNodeIds,
  workflowSchema
} from "../../../../../chunk-IV3I7AKL.mjs";
import {
  nodeTask
} from "../../../../../chunk-5RR4SONX.mjs";
import {
  nodeRegistry
} from "../../../../../chunk-7YAVUQQN.mjs";
import "../../../../../chunk-PAACUTJO.mjs";
import {
  logger,
  task,
  tasks
} from "../../../../../chunk-4NPKIL63.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// src/trigger/orchestrator.task.ts
init_esm();
var orchestratorTask = task({
  id: "workflow.orchestrator",
  run: /* @__PURE__ */ __name(async (payload, { ctx }) => {
    logger.info("Workflow execution start", {
      task: "workflow.orchestrator",
      runId: ctx.run.id
    });
    const workflow = workflowSchema.parse(payload.workflow);
    const executionOrder = topologicallySortNodeIds(workflow.nodes, workflow.edges);
    const context = { outputsByNodeId: {} };
    const nodeResults = [];
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        throw new Error(`Internal error: node "${nodeId}" not found in workflow.nodes`);
      }
      const nodeStartedAt = (/* @__PURE__ */ new Date()).toISOString();
      logger.info("Node orchestration start", { nodeId, type: node.type, runId: ctx.run.id });
      const effectiveInput = buildNodeInput(nodeId, node.input, context);
      nodeRegistry.parseInput(node.type, effectiveInput);
      const result = await tasks.triggerAndWait(nodeTask.id, {
        nodeId,
        type: node.type,
        input: effectiveInput
      });
      if (!result.ok) {
        logger.error("Node execution failed", {
          nodeId,
          type: node.type,
          error: result.error,
          runId: ctx.run.id
        });
        throw new Error(`Node "${nodeId}" (${node.type}) failed`);
      }
      context.outputsByNodeId[nodeId] = result.output;
      const nodeFinishedAt = (/* @__PURE__ */ new Date()).toISOString();
      nodeResults.push({
        nodeId,
        type: node.type,
        startedAt: nodeStartedAt,
        finishedAt: nodeFinishedAt,
        input: effectiveInput,
        output: result.output
      });
      logger.info("Node orchestration complete", {
        nodeId,
        type: node.type,
        output: result.output,
        runId: ctx.run.id
      });
    }
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    const run = {
      runId: ctx.run.id,
      status: "completed",
      startedAt,
      finishedAt,
      workflow,
      executionOrder,
      context,
      nodeResults
    };
    logger.info("Workflow execution complete", {
      runId: ctx.run.id,
      nodeCount: workflow.nodes.length,
      executionOrder
    });
    return run;
  }, "run")
});
function buildNodeInput(nodeId, rawInput, _ctx) {
  return rawInput;
}
__name(buildNodeInput, "buildNodeInput");
export {
  orchestratorTask
};
//# sourceMappingURL=orchestrator.task.mjs.map
