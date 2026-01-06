import type { z } from "zod";
import type { AnyNodeDefinition, NodeDefinition, ZodAny } from "./types";

/**
 * `defineNode` exists to make node definitions:
 * - consistent (one canonical shape)
 * - strongly typed (schemas drive the inferred input/output types)
 * - future-proof (we can add metadata fields without changing all callsites)
 *
 * There is deliberately NO runtime behavior here beyond returning the object.
 */
export function defineNode<
  const TType extends string,
  TInputSchema extends ZodAny,
  TOutputSchema extends ZodAny,
>(definition: NodeDefinition<TType, TInputSchema, TOutputSchema>) {
  return definition;
}

export type NodeInputOf<TNode extends AnyNodeDefinition> = z.infer<TNode["inputSchema"]>;
export type NodeOutputOf<TNode extends AnyNodeDefinition> = z.infer<TNode["outputSchema"]>;

