import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/lib/prisma";
import { workflowPersistenceSchema } from "@/app/lib/workflow.persistence.schema";

function ensureDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: "DATABASE_URL is not set. Configure Postgres and set DATABASE_URL in your environment.",
      },
      { status: 500 },
    );
  }
  return null;
}

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dbErr = ensureDatabaseConfigured();
  if (dbErr) return dbErr;

  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    select: { id: true, name: true, nodes: true, edges: true, updatedAt: true, createdAt: true },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dbErr = ensureDatabaseConfigured();
  if (dbErr) return dbErr;

  const { id } = await params;
  const json = await req.json();
  const parsed = updateWorkflowSchema.parse(json);

  const existing = await prisma.workflow.findUnique({
    where: { id },
    select: { nodes: true, edges: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const nodes = (parsed.nodes ?? existing.nodes) as unknown;
  const edges = (parsed.edges ?? existing.edges) as unknown;

  // Validate React Flow persistence shape (UI schema).
  workflowPersistenceSchema.parse({
    name: parsed.name ?? existing.name,
    nodes,
    edges,
  });

  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      name: parsed.name,
      // Prisma JSON typing differs across generated-client versions.
      // These values are validated structurally above and then persisted.
      nodes: nodes as any,
      edges: edges as any,
    },
    select: { id: true, name: true, nodes: true, edges: true, updatedAt: true, createdAt: true },
  });

  return NextResponse.json({ workflow: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dbErr = ensureDatabaseConfigured();
  if (dbErr) return dbErr;

  const { id } = await params;
  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

