import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const run = await prisma.workflowRun.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // If already terminal, no-op.
  if (run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELED") {
    return NextResponse.json({ ok: true, status: run.status });
  }

  await prisma.workflowRun.update({
    where: { id },
    data: { status: "CANCELED" },
  });

  // Best-effort: mark queued node runs as canceled (running/waiting may still finish).
  await prisma.nodeRun.updateMany({
    where: { workflowRunId: id, status: "QUEUED" },
    data: { status: "CANCELED", finishedAt: new Date() },
  });

  return NextResponse.json({ ok: true, status: "CANCELED" });
}

