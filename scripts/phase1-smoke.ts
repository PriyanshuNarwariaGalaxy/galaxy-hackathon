import assert from "node:assert/strict";
import { ZodError } from "zod";

import { nodeRegistry } from "../src/core/nodes/registry";
import { topologicallySortNodeIds, WorkflowDagError } from "../src/core/workflow/dag";
import { workflowSchema } from "../src/core/workflow/workflow.schema";

/**
 * Phase 1 smoke test:
 * - validates workflow canvas schema
 * - validates per-node inputs via NodeRegistry contracts
 * - computes DAG execution order and detects cycles
 *
 * No execution logic. No providers. No async.
 */

function expectThrows(fn: () => void, predicate: (err: unknown) => boolean, label: string) {
  try {
    fn();
  } catch (err) {
    if (!predicate(err)) {
      throw new Error(
        `Expected throw matching predicate for "${label}", but got: ${
          err instanceof Error ? `${err.name}: ${err.message}` : String(err)
        }`,
      );
    }
    return;
  }
  throw new Error(`Expected function to throw for "${label}", but it did not.`);
}

// 1) Valid workflow parses and topo-sorts correctly.
const validWorkflow = {
  nodes: [
    { id: "prompt_1", type: "prompt", input: { text: "Write a haiku about Zod." } },
    {
      id: "image_1",
      type: "image",
      input: { imageBase64: "BASE64", mimeType: "image/png" },
    },
    {
      id: "llm_1",
      type: "llm",
      input: {
        prompt: "Use the prompt text plus the image context.",
        images: [{ imageBase64: "BASE64", mimeType: "image/png" }],
        config: { model: "gpt-4.1-mini", temperature: 0.2, providers: ["fal", "replicate"] },
      },
    },
  ],
  edges: [
    { from: "prompt_1", to: "llm_1" },
    { from: "image_1", to: "llm_1" },
  ],
} as const;

const parsed = workflowSchema.parse(validWorkflow);

for (const n of parsed.nodes) {
  // Contract validation happens through the registry (schemas live with node definitions).
  const validated = nodeRegistry.parseInput(n.type, n.input);
  assert.ok(validated, `Expected validated input for node ${n.id}`);
}

const order = topologicallySortNodeIds(parsed.nodes, parsed.edges);
assert.equal(order.length, parsed.nodes.length);
assert.ok(order.indexOf("prompt_1") < order.indexOf("llm_1"), "prompt should come before llm");
assert.ok(order.indexOf("image_1") < order.indexOf("llm_1"), "image should come before llm");

// 2) Unknown node type is rejected by workflow schema (type enum derived from registry).
expectThrows(
  () => {
    workflowSchema.parse({
      nodes: [{ id: "x", type: "not-a-real-node", input: {} }],
      edges: [],
    });
  },
  (err) => err instanceof ZodError,
  "unknown node type rejected at workflow schema",
);

// 3) Invalid node input is rejected by the registry schema (workflow schema allows unknown).
expectThrows(
  () => {
    nodeRegistry.parseInput("llm", { prompt: "hi" }); // missing required config
  },
  (err) => err instanceof ZodError,
  "invalid llm input rejected by registry inputSchema",
);

// 4) Cycles are detected and produce a meaningful error.
expectThrows(
  () => {
    topologicallySortNodeIds(
      [
        { id: "a", type: "prompt", input: { text: "a" } },
        { id: "b", type: "prompt", input: { text: "b" } },
      ],
      [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    );
  },
  (err) => err instanceof WorkflowDagError && /Cycle detected/.test(err.message),
  "cycle detection",
);

console.log("Phase 1 smoke test: OK");
console.log("Topological order:", order.join(" -> "));

