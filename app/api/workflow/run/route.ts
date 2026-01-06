import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/lib/prisma";
import { configureTriggerClient } from "@/src/trigger/client";
import { workflowOrchestratorTask } from "@/src/trigger/workflow-orchestrator.task";
import { tasks } from "@trigger.dev/sdk/v3";

const schema = z.object({
  workflowId: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const { workflowId } = schema.parse(json);

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, nodes: true },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const nodeIds = Array.isArray(workflow.nodes)
    ? (workflow.nodes as any[]).map((n) => ({ id: String(n.id), type: String(n.type ?? "unknown") }))
    : [];

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      status: "QUEUED",
      nodeRuns: {
        create: nodeIds.map((n) => ({
          nodeId: n.id,
          nodeType: n.type,
          status: "QUEUED",
        })),
      },
    },
    select: { id: true },
  });

  // Kick off Trigger.dev orchestrator.
  try {
    configureTriggerClient();
    const handle = await tasks.trigger<typeof workflowOrchestratorTask>(workflowOrchestratorTask.id, {
      workflowId,
      workflowRunId: run.id,
    });

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { triggerRunId: handle.id },
    });

    return NextResponse.json({ workflowRunId: run.id, triggerRunId: handle.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    });
    return NextResponse.json(
      {
        error:
          "Failed to trigger workflow run. Check TRIGGER_SECRET_KEY and TRIGGER_API_URL (remove placeholder values).",
        details: message,
        workflowRunId: run.id,
      },
      { status: 502 },
    );
  }
}

