import type { z } from "zod";

/**
 *
 * A node is a black box described purely by:
 * - inputSchema: validates what the node accepts
 * - outputSchema: validates what the node produces
 *
 * There is intentionally NO execution logic here.
 */

export type NodeId = string;

export type ZodAny = z.ZodTypeAny;

/**
 * Core node contract definition.
 * - `type` is the stable identifier used in the workflow canvas + registry.
 * - `inputSchema` / `outputSchema` are the ONLY contract surface.
 */
export interface NodeDefinition<
  TType extends string,
  TInputSchema extends ZodAny,
  TOutputSchema extends ZodAny,
> {
  readonly type: TType;
  readonly title: string;
  readonly description?: string;
  readonly inputSchema: TInputSchema;
  readonly outputSchema: TOutputSchema;
}

export type AnyNodeDefinition = NodeDefinition<string, ZodAny, ZodAny>;

export type NodeInput<TNode extends AnyNodeDefinition> = z.infer<TNode["inputSchema"]>;
export type NodeOutput<TNode extends AnyNodeDefinition> = z.infer<TNode["outputSchema"]>;

/**
 * Workflow canvas primitives (contract-only).
 * The `input` is kept as `unknown` at the workflow schema level and is
 * validated later against the node's `inputSchema` from the registry.
 */
export interface WorkflowNodeInstance<TNodeType extends string = string> {
  readonly id: NodeId;
  readonly type: TNodeType;
  readonly input: unknown;
}

export interface WorkflowEdge {
  readonly from: NodeId;
  readonly to: NodeId;
}

