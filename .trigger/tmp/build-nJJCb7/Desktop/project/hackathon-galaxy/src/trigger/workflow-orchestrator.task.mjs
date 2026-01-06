import {
  imageTask
} from "../../../../../chunk-EIDXEO4H.mjs";
import {
  llmTask
} from "../../../../../chunk-Q3K7VQJU.mjs";
import {
  promptTask
} from "../../../../../chunk-PRR6VXPL.mjs";
import {
  prisma
} from "../../../../../chunk-27QNGBE2.mjs";
import {
  topologicallySortNodeIds,
  workflowSchema
} from "../../../../../chunk-IV3I7AKL.mjs";
import "../../../../../chunk-7YAVUQQN.mjs";
import "../../../../../chunk-VK6YHTNN.mjs";
import "../../../../../chunk-2ZVJYCGI.mjs";
import {
  external_exports
} from "../../../../../chunk-PAACUTJO.mjs";
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

// src/trigger/workflow-orchestrator.task.ts
init_esm();
var payloadSchema = external_exports.object({
  workflowId: external_exports.string().min(1),
  workflowRunId: external_exports.string().min(1)
});
function now() {
  return /* @__PURE__ */ new Date();
}
__name(now, "now");
function getTaskIdForType(type) {
  switch (type) {
    case "prompt":
      return promptTask.id;
    case "image":
      return imageTask.id;
    case "llm":
      return llmTask.id;
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}
__name(getTaskIdForType, "getTaskIdForType");
var workflowOrchestratorTask = task({
  id: "workflow.orchestrator.v3",
  run: /* @__PURE__ */ __name(async (rawPayload, { ctx }) => {
    const payload = payloadSchema.parse(rawPayload);
    logger.info("Workflow run start", {
      workflowId: payload.workflowId,
      workflowRunId: payload.workflowRunId,
      triggerRunId: ctx.run.id
    });
    await prisma.workflowRun.update({
      where: { id: payload.workflowRunId },
      data: { status: "RUNNING", startedAt: now(), triggerRunId: ctx.run.id }
    });
    const workflow = await prisma.workflow.findUnique({
      where: { id: payload.workflowId },
      select: { id: true, name: true, nodes: true, edges: true }
    });
    if (!workflow) {
      await prisma.workflowRun.update({
        where: { id: payload.workflowRunId },
        data: { status: "FAILED", finishedAt: now(), error: "Workflow not found" }
      });
      throw new Error("Workflow not found");
    }
    const rfNodes = workflow.nodes;
    const rfEdges = workflow.edges;
    const execNodes = rfNodes.map((n) => ({
      id: String(n.id),
      type: String(n.type),
      input: n?.data?.input ?? {}
    }));
    const execEdges = rfEdges.map((e) => ({
      from: String(e.source),
      to: String(e.target)
    }));
    const validatedWorkflow = workflowSchema.parse({ nodes: execNodes, edges: execEdges });
    const order = topologicallySortNodeIds(validatedWorkflow.nodes, validatedWorkflow.edges);
    const context = {};
    for (const nodeId of order) {
      const current = await prisma.workflowRun.findUnique({
        where: { id: payload.workflowRunId },
        select: { status: true }
      });
      if (current?.status === "CANCELED") {
        await prisma.nodeRun.updateMany({
          where: { workflowRunId: payload.workflowRunId, status: "QUEUED" },
          data: { status: "CANCELED", finishedAt: now() }
        });
        await prisma.workflowRun.update({
          where: { id: payload.workflowRunId },
          data: { status: "CANCELED", finishedAt: now(), context }
        });
        logger.info("Workflow run canceled", {
          workflowId: payload.workflowId,
          workflowRunId: payload.workflowRunId,
          triggerRunId: ctx.run.id
        });
        return { workflowRunId: payload.workflowRunId, status: "CANCELED" };
      }
      const node = validatedWorkflow.nodes.find((n) => n.id === nodeId);
      const taskId = getTaskIdForType(node.type);
      logger.info("Node start", { workflowRunId: payload.workflowRunId, nodeId, type: node.type });
      const effectiveInput = resolveInput(node.input, context);
      const result = await tasks.triggerAndWait(taskId, {
        workflowRunId: payload.workflowRunId,
        nodeId,
        input: effectiveInput
      });
      if (!result.ok) {
        await prisma.nodeRun.update({
          where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId } },
          data: { status: "FAILED", finishedAt: now(), error: "Node task failed" }
        });
        await prisma.workflowRun.update({
          where: { id: payload.workflowRunId },
          data: { status: "FAILED", finishedAt: now(), error: `Node failed: ${nodeId}` }
        });
        throw new Error(`Node "${nodeId}" failed`);
      }
      const after = await prisma.workflowRun.findUnique({
        where: { id: payload.workflowRunId },
        select: { status: true }
      });
      if (after?.status === "CANCELED") {
        await prisma.nodeRun.updateMany({
          where: { workflowRunId: payload.workflowRunId, status: "QUEUED" },
          data: { status: "CANCELED", finishedAt: now() }
        });
        await prisma.workflowRun.update({
          where: { id: payload.workflowRunId },
          data: { status: "CANCELED", finishedAt: now(), context }
        });
        logger.info("Workflow run canceled (post-node)", {
          workflowId: payload.workflowId,
          workflowRunId: payload.workflowRunId,
          triggerRunId: ctx.run.id
        });
        return { workflowRunId: payload.workflowRunId, status: "CANCELED" };
      }
      context[nodeId] = result.output;
      logger.info("Node complete", { workflowRunId: payload.workflowRunId, nodeId, type: node.type });
    }
    await prisma.workflowRun.update({
      where: { id: payload.workflowRunId },
      data: { status: "COMPLETED", finishedAt: now(), context }
    });
    logger.info("Workflow run complete", {
      workflowId: payload.workflowId,
      workflowRunId: payload.workflowRunId,
      triggerRunId: ctx.run.id
    });
    return { workflowRunId: payload.workflowRunId, status: "COMPLETED" };
  }, "run")
});
function resolveInput(input, context) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const anyObj = input;
    if (typeof anyObj.$from === "string") {
      return context[anyObj.$from] ?? {};
    }
  }
  return input;
}
__name(resolveInput, "resolveInput");
export {
  workflowOrchestratorTask
};
//# sourceMappingURL=workflow-orchestrator.task.mjs.map
