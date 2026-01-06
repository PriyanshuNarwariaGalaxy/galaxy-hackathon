import { z } from "zod";
import type { AnyNodeDefinition, NodeInput, NodeOutput } from "./types";
import { imageNode } from "./definitions/image.node";
import { llmNode } from "./definitions/llm.node";
import { promptNode } from "./definitions/prompt.node";

/**
 * The single source of truth for which nodes exist in the system.
 *
 * Why an object (instead of scattered exports)?
 * - Makes node types derivable (NodeType = keyof typeof nodeDefinitions)
 * - Makes runtime enumeration trivial (for validation + UI later)
 * - Encourages explicit registration, which is critical in production systems
 */
export const nodeDefinitions = {
  prompt: promptNode,
  image: imageNode,
  llm: llmNode,
} as const;

export type NodeType = keyof typeof nodeDefinitions;
export type RegisteredNodeDefinition<TType extends NodeType = NodeType> =
  (typeof nodeDefinitions)[TType];

function nonEmptyArray<T>(arr: T[]): [T, ...T[]] {
  if (arr.length === 0) {
    // This should never happen (we ship with built-in node defs),
    // but it protects the contract for `z.enum(...)`.
    throw new Error("Node registry must include at least one node definition.");
  }
  return arr as [T, ...T[]];
}

/**
 * Runtime schema for node type.
 * Derived from `nodeDefinitions` so we don't duplicate identifiers.
 */
export const nodeTypeSchema = z.enum(
  nonEmptyArray(Object.keys(nodeDefinitions) as NodeType[]),
);

/**
 * NodeRegistry is a thin type-safe wrapper around the registered definitions.
 *
 * Why does this abstraction exist?
 * - Centralizes node lookup (and later: node versioning, deprecation, etc.)
 * - Provides canonical parsing helpers (input/output validation via Zod)
 * - Ensures the map remains type-safe and extensible
 */
export class NodeRegistry<TDefs extends Record<string, AnyNodeDefinition>> {
  public readonly definitions: TDefs;

  constructor(definitions: TDefs) {
    this.definitions = definitions;
  }

  listTypes(): Array<keyof TDefs> {
    return Object.keys(this.definitions) as Array<keyof TDefs>;
  }

  get<TType extends keyof TDefs>(type: TType): TDefs[TType] {
    const def = this.definitions[type];
    if (!def) {
      // Defensive: should be impossible in typed code, but workflows are data.
      throw new Error(`Unknown node type: ${String(type)}`);
    }
    return def;
  }

  parseInput<TType extends keyof TDefs>(
    type: TType,
    input: unknown,
  ): NodeInput<TDefs[TType]> {
    return this.get(type).inputSchema.parse(input) as NodeInput<TDefs[TType]>;
  }

  parseOutput<TType extends keyof TDefs>(
    type: TType,
    output: unknown,
  ): NodeOutput<TDefs[TType]> {
    return this.get(type).outputSchema.parse(output) as NodeOutput<TDefs[TType]>;
  }
}

export const nodeRegistry = new NodeRegistry(nodeDefinitions);

