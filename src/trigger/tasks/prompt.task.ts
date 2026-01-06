import { task } from "@trigger.dev/sdk/v3";
import { nodeRegistry } from "@/src/core/nodes/registry";
import { prisma } from "@/src/db/prisma";

function now() {
  return new Date();
}

export const promptTask = task({
  id: "node.prompt",
  run: async (payload: { workflowRunId: string; nodeId: string; input: unknown }, { ctx }) => {
    const def = nodeRegistry.get("prompt");
    const validatedInput = def.inputSchema.parse(payload.input);

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "RUNNING", startedAt: now(), input: validatedInput as any },
    });

    // Deterministic mock (Phase 3 still no real providers for prompt)
    const rawOutput = { text: validatedInput.text };
    const validatedOutput = def.outputSchema.parse(rawOutput);

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "COMPLETED", finishedAt: now(), output: validatedOutput as any },
    });

    return validatedOutput;
  },
});

