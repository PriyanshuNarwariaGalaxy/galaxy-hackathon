import { z } from "zod";

/**
 * fal.ai provider adapter types (Phase 3).
 * This is provider-specific and lives under src/trigger/providers/fal/.
 *
 * The orchestrator must not depend on these details.
 */

export const falProviderId = "fal" as const;
export type FalProviderId = typeof falProviderId;

/**
 * Minimal "submit" response used by our engine:
 * - `tokenId`: Trigger waitpoint token id to resume later
 * - `tokenUrl`: URL to be used as a webhook callback by the provider
 * - `requestId`: provider-side request identifier (if available)
 */
export const falSubmitResultSchema = z.object({
  tokenId: z.string().min(1),
  tokenUrl: z.string().url(),
  requestId: z.string().optional(),
});
export type FalSubmitResult = z.infer<typeof falSubmitResultSchema>;

/**
 * The payload we expect to receive when the waitpoint is completed.
 * This should be shaped to match the node output schema, and validated by the node task.
 */
export const falResumePayloadSchema = z.object({
  text: z.string(),
});
export type FalResumePayload = z.infer<typeof falResumePayloadSchema>;

