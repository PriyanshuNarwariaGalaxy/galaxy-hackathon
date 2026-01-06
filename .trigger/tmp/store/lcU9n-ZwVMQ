import {
  nodeRegistry
} from "./chunk-7YAVUQQN.mjs";
import {
  external_exports
} from "./chunk-PAACUTJO.mjs";
import {
  logger,
  task
} from "./chunk-4NPKIL63.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/node.task.ts
init_esm();
var nodeTask = task({
  id: "workflow.node",
  run: /* @__PURE__ */ __name(async (payload, { ctx }) => {
    logger.info("Node execution start", {
      nodeId: payload.nodeId,
      type: payload.type,
      runId: ctx.run.id
    });
    const def = nodeRegistry.get(payload.type);
    const validatedInput = def.inputSchema.parse(payload.input);
    const rawOutput = mockExecute(payload.type, validatedInput);
    const validatedOutput = def.outputSchema.parse(rawOutput);
    logger.info("Node execution complete", {
      nodeId: payload.nodeId,
      type: payload.type,
      output: validatedOutput,
      runId: ctx.run.id
    });
    return validatedOutput;
  }, "run")
});
function mockExecute(type, input) {
  switch (type) {
    case "prompt": {
      return { text: "mock prompt output" };
    }
    case "image": {
      return { imageBase64: "mock-image-base64", mimeType: "image/png" };
    }
    case "llm": {
      const parsed = external_exports.object({
        config: external_exports.object({
          providers: external_exports.array(external_exports.string())
        })
      }).safeParse(input);
      const providerUsed = parsed.success ? parsed.data.config.providers[0] ?? "mock" : "mock";
      return { text: "mock LLM output", providerUsed };
    }
    default: {
      return input;
    }
  }
}
__name(mockExecute, "mockExecute");

export {
  nodeTask
};
//# sourceMappingURL=chunk-5RR4SONX.mjs.map
