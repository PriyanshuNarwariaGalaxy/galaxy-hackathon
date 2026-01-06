import { task } from "@trigger.dev/sdk/v3";
import { nodeRegistry } from "@/src/core/nodes/registry";
import { prisma } from "@/src/db/prisma";

function now() {
  return new Date();
}

export const imageTask = task({
  id: "node.image",
  run: async (payload: { workflowRunId: string; nodeId: string; input: unknown }) => {
    const def = nodeRegistry.get("image");
    const validatedInput = def.inputSchema.parse(payload.input);

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "RUNNING", startedAt: now(), input: validatedInput as any },
    });

    // Deterministic mock: passthrough input
    const rawOutput = validatedInput;
    const validatedOutput = def.outputSchema.parse(rawOutput);

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "COMPLETED", finishedAt: now(), output: validatedOutput as any },
    });

    return validatedOutput;
  },
});

