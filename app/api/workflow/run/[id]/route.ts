import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const run = await prisma.workflowRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      workflowId: true,
      triggerRunId: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      error: true,
      context: true,
      nodeRuns: {
        orderBy: { createdAt: "asc" },
        select: {
          nodeId: true,
          nodeType: true,
          status: true,
          provider: true,
          input: true,
          output: true,
          logs: true,
          error: true,
          startedAt: true,
          finishedAt: true,
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
}

