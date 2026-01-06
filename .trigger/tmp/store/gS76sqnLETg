import {
  prisma
} from "./chunk-27QNGBE2.mjs";
import {
  nodeRegistry
} from "./chunk-7YAVUQQN.mjs";
import {
  task
} from "./chunk-4NPKIL63.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/tasks/prompt.task.ts
init_esm();
function now() {
  return /* @__PURE__ */ new Date();
}
__name(now, "now");
var promptTask = task({
  id: "node.prompt",
  run: /* @__PURE__ */ __name(async (payload, { ctx }) => {
    const def = nodeRegistry.get("prompt");
    const validatedInput = def.inputSchema.parse(payload.input);
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "RUNNING", startedAt: now(), input: validatedInput }
    });
    const rawOutput = { text: validatedInput.text };
    const validatedOutput = def.outputSchema.parse(rawOutput);
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "COMPLETED", finishedAt: now(), output: validatedOutput }
    });
    return validatedOutput;
  }, "run")
});

export {
  promptTask
};
//# sourceMappingURL=chunk-PRR6VXPL.mjs.map
