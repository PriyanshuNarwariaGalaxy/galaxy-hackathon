import { logger, wait } from "@trigger.dev/sdk/v3";
import { falProviderId, type FalResumePayload, type FalSubmitResult } from "./types";

/**
 * fal.ai provider adapter (Phase 3).
 *
 * This adapter is intentionally small and split into:
 * - submit(): create a Trigger waitpoint token and (in the future) submit the job to fal.ai
 * - resume(): wait for the token to be completed (typically by a webhook)
 *
 * NOTE: We do NOT hardcode fal in the orchestrator. Node execution tasks select providers.
 */

export async function submitFalJob(params: {
  workflowRunId: string;
  nodeId: string;
  // Provider-specific options can be added later (model, endpoint, etc.)
}): Promise<FalSubmitResult> {
  // Create a Trigger waitpoint token which becomes the webhook URL.
  const token = await wait.createToken({
    timeout: "10m",
    tags: [
      `provider:${falProviderId}`,
      `workflowRun:${params.workflowRunId}`,
      `node:${params.nodeId}`,
    ],
  });

  logger.info("fal submit: created wait token", {
    provider: falProviderId,
    workflowRunId: params.workflowRunId,
    nodeId: params.nodeId,
    tokenId: token.id,
  });

  /**
   * TODO (real fal integration):
   * - call fal.ai to submit the job
   * - pass `token.url` as webhook callback URL so fal can resume the run by completing the token
   * - capture provider requestId and return it
   *
   * For now we keep this adapter "production-ready shape" but without external calls.
   * You can enable deterministic local runs by setting FAL_MOCK_MODE=1.
   */
  if (process.env.FAL_MOCK_MODE === "1") {
    await wait.completeToken(token, { text: "mock LLM output (fal)" } satisfies FalResumePayload);
  }

  return {
    tokenId: token.id,
    tokenUrl: token.url,
    requestId: undefined,
  };
}

export async function resumeFalJob(params: {
  tokenId: string;
}): Promise<FalResumePayload> {
  // Wait for provider to complete the token (e.g., via webhook).
  // This must run inside a Trigger task context (node task).
  const output = await wait.forToken<FalResumePayload>(params.tokenId).unwrap();
  return output;
}

