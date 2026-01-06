import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { nodeRegistry, type NodeType } from "../core/nodes/registry";

/**
 * Node task :
 * - Validates input with the node's Zod input schema
 * - Executes deterministic mock logic (no providers yet)
 * - Validates output with the node's Zod output schema
 *
 * IMPORTANT: This is the only place where node "work" happens.
 * The orchestrator does orchestration only.
 */

export const nodeTask = task({
  id: "workflow.node",
  run: async (
    payload: {
      nodeId: string;
      type: NodeType;
      input: unknown;
    },
    { ctx },
  ) => {
    logger.info("Node execution start", {
      nodeId: payload.nodeId,
      type: payload.type,
      runId: ctx.run.id,
    });

    const def = nodeRegistry.get(payload.type);

    // Validate input at the boundary.
    const validatedInput = def.inputSchema.parse(payload.input);

    // Deterministic mock execution (must match the output schema).
    const rawOutput: unknown = mockExecute(payload.type, validatedInput);

    // Validate output at the boundary.
    const validatedOutput = def.outputSchema.parse(rawOutput);

    logger.info("Node execution complete", {
      nodeId: payload.nodeId,
      type: payload.type,
      output: validatedOutput,
      runId: ctx.run.id,
    });

    return validatedOutput;
  },
});

function mockExecute(type: NodeType, input: unknown): unknown {
  switch (type) {
    case "prompt": {
      // Contract: { text: string } -> { text: string }
      return { text: "mock prompt output" };
    }
    case "image": {
      // Contract: { imageBase64: string, mimeType: string } -> same shape
      return { imageBase64: "mock-image-base64", mimeType: "image/png" };
    }
    case "llm": {
      // Contract: { prompt, images?, config } -> { text, providerUsed }
      const parsed = z
        .object({
          config: z.object({
            providers: z.array(z.string()),
          }),
        })
        .safeParse(input);

      const providerUsed = parsed.success ? parsed.data.config.providers[0] ?? "mock" : "mock";
      return { text: "mock LLM output", providerUsed };
    }
    default: {
      // Exhaustive safety: should never happen due to NodeType typing.
      return input;
    }
  }
}

