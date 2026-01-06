import { z } from "zod";
import { defineNode } from "../base";

/**
 * LLM Node
 * - Pure contract: declares prompt + optional images + config.
 * - Providers list is constrained to known provider identifiers (for future execution).
 */
export const llmNode = defineNode({
  type: "llm",
  title: "LLM",
  description: "Requests an LLM completion with optional images and provider selection constraints.",
  inputSchema: z.object({
    prompt: z.string(),
    images: z
      .array(
        z.object({
          imageBase64: z.string(),
          mimeType: z.string(),
        }),
      )
      .optional(),
    config: z.object({
      model: z.string(),
      temperature: z.number(),
      providers: z.array(z.enum(["fal", "replicate", "wavespeed"])),
    }),
  }),
  outputSchema: z.object({
    text: z.string(),
    providerUsed: z.string(),
  }),
} as const);

