import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/lib/prisma";
import { workflowSchema } from "@/src/core/workflow/workflow.schema";

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(120),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

export async function GET() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = createWorkflowSchema.parse(json);

  // Validate structure using Phase 1 workflow schema.
  workflowSchema.parse({ nodes: parsed.nodes, edges: parsed.edges });

  const created = await prisma.workflow.create({
    data: {
      name: parsed.name,
      nodes: parsed.nodes,
      edges: parsed.edges,
    },
    select: { id: true, name: true, updatedAt: true, createdAt: true, nodes: true, edges: true },
  });

  return NextResponse.json({ workflow: created }, { status: 201 });
}

