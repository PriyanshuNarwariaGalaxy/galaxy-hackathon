import { NextResponse } from "next/server";

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

export async function GET() {
  const dbErr = ensureDatabaseConfigured();
  if (dbErr) return dbErr;

  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const dbErr = ensureDatabaseConfigured();
  if (dbErr) return dbErr;

  const json = await req.json();
  const parsed = workflowPersistenceSchema.parse(json);

  const created = await prisma.workflow.create({
    data: {
      name: parsed.name,
      // Prisma JSON typing differs across generated-client versions.
      // We validate shape via Zod above; then persist as JSON.
      nodes: parsed.nodes as any,
      edges: parsed.edges as any,
    },
    select: { id: true, name: true, updatedAt: true, createdAt: true, nodes: true, edges: true },
  });

  return NextResponse.json({ workflow: created }, { status: 201 });
}

