import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workflowId = url.searchParams.get("workflowId");

  const runs = await prisma.workflowRun.findMany({
    ...(workflowId ? { where: { workflowId } } : {}),
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      workflowId: true,
      triggerRunId: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      error: true,
    },
  });
  return NextResponse.json({ runs });
}

