import { task } from "@trigger.dev/sdk/v3";
import { nodeRegistry } from "@/src/core/nodes/registry";
import { prisma } from "@/src/db/prisma";
import { submitFalJob, resumeFalJob } from "@/src/trigger/providers/fal/adapter";
import { falProviderId } from "@/src/trigger/providers/fal/types";

function now() {
  return new Date();
}

/**
 * LLM task:
 * - validates input/output with Zod contracts
 * - executes via provider fallback engine
 *
 * NOTE: Provider implementations are mocked (no real API calls yet).
 */
export const llmTask = task({
  id: "node.llm",
  run: async (payload: { workflowRunId: string; nodeId: string; input: unknown }) => {
    const def = nodeRegistry.get("llm");
    const validatedInput = def.inputSchema.parse(payload.input);

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "RUNNING", startedAt: now(), input: validatedInput as any, provider: falProviderId },
    });

    // Submit job to fal and get a wait token (webhook URL is tokenUrl).
    const submit = await submitFalJob({
      workflowRunId: payload.workflowRunId,
      nodeId: payload.nodeId,
    });

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: {
        status: "WAITING",
        logs: [
          {
            event: "submitted",
            provider: falProviderId,
            tokenId: submit.tokenId,
            tokenUrl: submit.tokenUrl,
            at: new Date().toISOString(),
          },
        ] as any,
      },
    });

    const resumed = await resumeFalJob({ tokenId: submit.tokenId });

    // Ensure contract shape exactly matches output schema.
    const validatedOutput = def.outputSchema.parse({
      text: resumed.text,
      providerUsed: falProviderId,
    });

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: {
        status: "COMPLETED",
        finishedAt: now(),
        output: validatedOutput as any,
        provider: falProviderId,
      },
    });

    return validatedOutput;
  },
});

