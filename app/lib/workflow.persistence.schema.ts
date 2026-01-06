import { z } from "zod";
import { nodeTypeSchema } from "@/src/core/nodes/registry";

/**
 * UI persistence schema for React Flow canvas state.
 *
 * IMPORTANT:
 * - This is NOT the Phase-1 execution workflow schema.
 * - The execution schema stays in `src/core/workflow/workflow.schema.ts`.
 * - UI stores React Flow nodes/edges (including position) so the editor can restore layout.
 */

export const reactFlowNodeSchema = z
  .object({
    id: z.string().min(1),
    type: nodeTypeSchema,
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    data: z.unknown().optional(),
  })
  .passthrough();

export const reactFlowEdgeSchema = z
  .object({
    source: z.string().min(1),
    target: z.string().min(1),
  })
  .passthrough();

export const workflowPersistenceSchema = z.object({
  name: z.string().min(1).max(120),
  nodes: z.array(reactFlowNodeSchema),
  edges: z.array(reactFlowEdgeSchema),
});

