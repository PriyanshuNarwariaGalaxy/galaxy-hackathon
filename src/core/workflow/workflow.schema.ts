import { z } from "zod";
import { nodeTypeSchema } from "../nodes/registry";

/**
 * Workflow schema represents the canvas state (not execution state).
 * - `input` is intentionally `unknown` here to match the UI/data layer.
 * - Contract validation of each node's `input` is performed via the NodeRegistry
 *   (because schemas live with node definitions).
 */

export const workflowNodeSchema = z.object({
  id: z.string().min(1, "Node id must be a non-empty string."),
  type: nodeTypeSchema,
  input: z.unknown(),
});

export const workflowEdgeSchema = z.object({
  from: z.string().min(1, "Edge.from must be a non-empty string."),
  to: z.string().min(1, "Edge.to must be a non-empty string."),
});

export const workflowSchema = z
  .object({
    nodes: z.array(workflowNodeSchema),
    edges: z.array(workflowEdgeSchema),
  })
  .superRefine((workflow, ctx) => {
    // Enforce unique node ids (critical for DAG correctness).
    const ids = workflow.nodes.map((n) => n.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate node ids are not allowed: ${Array.from(new Set(duplicates)).join(", ")}`,
        path: ["nodes"],
      });
    }

    const idSet = new Set(ids);
    // Ensure edges reference existing nodes (good early error message for the canvas).
    for (let i = 0; i < workflow.edges.length; i++) {
      const e = workflow.edges[i];
      if (!idSet.has(e.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge.from references unknown node id "${e.from}".`,
          path: ["edges", i, "from"],
        });
      }
      if (!idSet.has(e.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge.to references unknown node id "${e.to}".`,
          path: ["edges", i, "to"],
        });
      }
    }
  });

export type Workflow = z.infer<typeof workflowSchema>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;


