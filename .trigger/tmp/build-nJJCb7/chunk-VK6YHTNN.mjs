import {
  falProviderId
} from "./chunk-2ZVJYCGI.mjs";
import {
  logger,
  wait
} from "./chunk-4NPKIL63.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/providers/fal/adapter.ts
init_esm();
async function submitFalJob(params) {
  const token = await wait.createToken({
    timeout: "10m",
    tags: [
      `provider:${falProviderId}`,
      `workflowRun:${params.workflowRunId}`,
      `node:${params.nodeId}`
    ]
  });
  logger.info("fal submit: created wait token", {
    provider: falProviderId,
    workflowRunId: params.workflowRunId,
    nodeId: params.nodeId,
    tokenId: token.id
  });
  if (process.env.FAL_MOCK_MODE === "1") {
    await wait.completeToken(token, { text: "mock LLM output (fal)" });
  }
  return {
    tokenId: token.id,
    tokenUrl: token.url,
    requestId: void 0
  };
}
__name(submitFalJob, "submitFalJob");
async function resumeFalJob(params) {
  const output = await wait.forToken(params.tokenId).unwrap();
  return output;
}
__name(resumeFalJob, "resumeFalJob");

export {
  submitFalJob,
  resumeFalJob
};
//# sourceMappingURL=chunk-VK6YHTNN.mjs.map
