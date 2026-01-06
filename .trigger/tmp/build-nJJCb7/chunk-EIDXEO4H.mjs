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

// src/trigger/tasks/image.task.ts
init_esm();
function now() {
  return /* @__PURE__ */ new Date();
}
__name(now, "now");
var imageTask = task({
  id: "node.image",
  run: /* @__PURE__ */ __name(async (payload) => {
    const def = nodeRegistry.get("image");
    const validatedInput = def.inputSchema.parse(payload.input);
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "RUNNING", startedAt: now(), input: validatedInput }
    });
    const rawOutput = validatedInput;
    const validatedOutput = def.outputSchema.parse(rawOutput);
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId: payload.workflowRunId, nodeId: payload.nodeId } },
      data: { status: "COMPLETED", finishedAt: now(), output: validatedOutput }
    });
    return validatedOutput;
  }, "run")
});

export {
  imageTask
};
//# sourceMappingURL=chunk-EIDXEO4H.mjs.map
