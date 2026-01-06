import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await prisma.workflow.findUnique({
    where: { id },
    select: { name: true, nodes: true, edges: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const duplicated = await prisma.workflow.create({
    data: {
      name: `${existing.name} (copy)`,
      nodes: existing.nodes,
      edges: existing.edges,
    },
    select: { id: true, name: true, nodes: true, edges: true, updatedAt: true, createdAt: true },
  });

  return NextResponse.json({ workflow: duplicated }, { status: 201 });
}

