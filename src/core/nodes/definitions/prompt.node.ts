import { z } from "zod";
import { defineNode } from "../base";

/**
 * Prompt Node
 * - Pure contract: takes text, returns text.
 */
export const promptNode = defineNode({
  type: "prompt",
  title: "Prompt",
  description: "Represents raw user text used as a prompt input.",
  inputSchema: z.object({
    text: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
} as const);

