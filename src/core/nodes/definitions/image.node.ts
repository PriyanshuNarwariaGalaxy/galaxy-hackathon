import { z } from "zod";
import { defineNode } from "../base";

/**
 * Image Node
 * - Pure contract: passes through image payload (base64 + mimeType).
 */
export const imageNode = defineNode({
  type: "image",
  title: "Image",
  description: "Represents an image payload used as a workflow input or intermediate artifact.",
  inputSchema: z.object({
    imageBase64: z.string(),
    mimeType: z.string(),
  }),
  outputSchema: z.object({
    imageBase64: z.string(),
    mimeType: z.string(),
  }),
} as const);

