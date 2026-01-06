import {
  prisma
} from "./chunk-27QNGBE2.mjs";
import {
  nodeRegistry
} from "./chunk-7YAVUQQN.mjs";
import {
  resumeFalJob,
  submitFalJob
} from "./chunk-VK6YHTNN.mjs";
import {
  falProviderId
} from "./chunk-2ZVJYCGI.mjs";
import {
  task
} from "./chunk-4NPKIL63.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/tasks/llm.task.ts
init_esm();
function now() {
  return /* @__PURE__ */ new Date();
}
__name(now, "now");
var llmTask = task({
  id: "node.llm",
  run: /* @__PURE__ */ __name(async (payload) => {
    const def = nodeRegistry.get("llm");
    const validatedInput = def.inputSchema.parse(payload.input);
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "RUNNING", startedAt: now(), input: validatedInput, provider: falProviderId }
    });
    const submit = await submitFalJob({
      workflowRunId: payload.workflowRunId,
      nodeId: payload.nodeId
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
            at: (/* @__PURE__ */ new Date()).toISOString()
          }
        ]
      }
    });
    const resumed = await resumeFalJob({ tokenId: submit.tokenId });
    const validatedOutput = def.outputSchema.parse({
      text: resumed.text,
      providerUsed: falProviderId
    });
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: {
        status: "COMPLETED",
        finishedAt: now(),
        output: validatedOutput,
        provider: falProviderId
      }
    });
    return validatedOutput;
  }, "run")
});

export {
  llmTask
};
//# sourceMappingURL=chunk-Q3K7VQJU.mjs.map
