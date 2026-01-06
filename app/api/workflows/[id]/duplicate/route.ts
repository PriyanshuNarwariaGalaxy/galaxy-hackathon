import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const dbErr = ensureDatabaseConfigured();
  if (dbErr) return dbErr;

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
      // Prisma JSON typing differs across generated-client versions.
      // These values originate from Prisma itself (read -> write), so this cast is safe.
      nodes: existing.nodes as any,
      edges: existing.edges as any,
    },
    select: { id: true, name: true, nodes: true, edges: true, updatedAt: true, createdAt: true },
  });

  return NextResponse.json({ workflow: duplicated }, { status: 201 });
}

