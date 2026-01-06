import { logger, task, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { workflowSchema } from "@/src/core/workflow/workflow.schema";
import { topologicallySortNodeIds } from "@/src/core/workflow/dag";
import { prisma } from "@/src/db/prisma";

import { promptTask } from "@/src/trigger/tasks/prompt.task";
import { imageTask } from "@/src/trigger/tasks/image.task";
import { llmTask } from "@/src/trigger/tasks/llm.task";

const payloadSchema = z.object({
  workflowId: z.string().min(1),
  workflowRunId: z.string().min(1),
});

function now() {
  return new Date();
}

function getTaskIdForType(type: string) {
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

/**
 * Phase 3 Orchestrator:
 * - loads workflow from DB (React Flow nodes/edges)
 * - adapts to Phase 1 execution schema shape {id,type,input}
 * - validates with Phase 1 Zod schema
 * - topo-sorts and runs nodes sequentially via triggerAndWait
 * - persists WorkflowRun + NodeRun status, timings, context
 */
export const workflowOrchestratorTask = task({
  id: "workflow.orchestrator.v3",
  run: async (rawPayload: unknown, { ctx }) => {
    const payload = payloadSchema.parse(rawPayload);

    logger.info("Workflow run start", {
      workflowId: payload.workflowId,
      workflowRunId: payload.workflowRunId,
      triggerRunId: ctx.run.id,
    });

    await prisma.workflowRun.update({
      where: { id: payload.workflowRunId },
      data: { status: "RUNNING", startedAt: now(), triggerRunId: ctx.run.id },
    });

    const workflow = await prisma.workflow.findUnique({
      where: { id: payload.workflowId },
      select: { id: true, name: true, nodes: true, edges: true },
    });
    if (!workflow) {
      await prisma.workflowRun.update({
        where: { id: payload.workflowRunId },
        data: { status: "FAILED", finishedAt: now(), error: "Workflow not found" },
      });
      throw new Error("Workflow not found");
    }

    // Adapt persisted React Flow graph -> Phase 1 execution schema graph
    const rfNodes = workflow.nodes as any[];
    const rfEdges = workflow.edges as any[];

    const execNodes = rfNodes.map((n) => ({
      id: String(n.id),
      type: String(n.type),
      input: n?.data?.input ?? {},
    }));
    const execEdges = rfEdges.map((e) => ({
      from: String(e.source),
      to: String(e.target),
    }));

    // Validate structure + node types against Phase 1 contract registry
    const validatedWorkflow = workflowSchema.parse({ nodes: execNodes, edges: execEdges });

    const order = topologicallySortNodeIds(validatedWorkflow.nodes, validatedWorkflow.edges);

    const context: Record<string, unknown> = {};

    for (const nodeId of order) {
      const current = await prisma.workflowRun.findUnique({
        where: { id: payload.workflowRunId },
        select: { status: true },
      });
      if (current?.status === "CANCELED") {
        // Mark remaining queued nodes as canceled and stop scheduling new work.
        await prisma.nodeRun.updateMany({
          where: { workflowRunId: payload.workflowRunId, status: "QUEUED" },
          data: { status: "CANCELED", finishedAt: now() },
        });
        await prisma.workflowRun.update({
          where: { id: payload.workflowRunId },
          data: { status: "CANCELED", finishedAt: now(), context: context as any },
        });
        logger.info("Workflow run canceled", {
          workflowId: payload.workflowId,
          workflowRunId: payload.workflowRunId,
          triggerRunId: ctx.run.id,
        });
        return { workflowRunId: payload.workflowRunId, status: "CANCELED" as const };
      }

      const node = validatedWorkflow.nodes.find((n) => n.id === nodeId)!;
      const taskId = getTaskIdForType(node.type);

      logger.info("Node start", { workflowRunId: payload.workflowRunId, nodeId, type: node.type });

      // Minimal context passing: allow nodes to reference previous outputs via "$from".
      // If node.input contains { $from: "someNodeId" }, replace it with that node output.
      const effectiveInput = resolveInput(node.input, context);

      const result = await tasks.triggerAndWait(taskId as any, {
        workflowRunId: payload.workflowRunId,
        nodeId,
        input: effectiveInput,
      });

      if (!result.ok) {
        await prisma.nodeRun.update({
          where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId } },
          data: { status: "FAILED", finishedAt: now(), error: "Node task failed" },
        });
        await prisma.workflowRun.update({
          where: { id: payload.workflowRunId },
          data: { status: "FAILED", finishedAt: now(), error: `Node failed: ${nodeId}` },
        });
        throw new Error(`Node "${nodeId}" failed`);
      }

      // If the run was canceled while we were waiting for this node, ignore output and stop.
      const after = await prisma.workflowRun.findUnique({
        where: { id: payload.workflowRunId },
        select: { status: true },
      });
      if (after?.status === "CANCELED") {
        await prisma.nodeRun.updateMany({
          where: { workflowRunId: payload.workflowRunId, status: "QUEUED" },
          data: { status: "CANCELED", finishedAt: now() },
        });
        await prisma.workflowRun.update({
          where: { id: payload.workflowRunId },
          data: { status: "CANCELED", finishedAt: now(), context: context as any },
        });
        logger.info("Workflow run canceled (post-node)", {
          workflowId: payload.workflowId,
          workflowRunId: payload.workflowRunId,
          triggerRunId: ctx.run.id,
        });
        return { workflowRunId: payload.workflowRunId, status: "CANCELED" as const };
      }

      context[nodeId] = result.output;

      logger.info("Node complete", { workflowRunId: payload.workflowRunId, nodeId, type: node.type });
    }

    await prisma.workflowRun.update({
      where: { id: payload.workflowRunId },
      data: { status: "COMPLETED", finishedAt: now(), context: context as any },
    });

    logger.info("Workflow run complete", {
      workflowId: payload.workflowId,
      workflowRunId: payload.workflowRunId,
      triggerRunId: ctx.run.id,
    });

    return { workflowRunId: payload.workflowRunId, status: "COMPLETED" as const };
  },
});

function resolveInput(input: unknown, context: Record<string, unknown>): unknown {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const anyObj = input as any;
    if (typeof anyObj.$from === "string") {
      return context[anyObj.$from] ?? {};
    }
  }
  return input;
}

