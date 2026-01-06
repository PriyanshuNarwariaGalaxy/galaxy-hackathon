import {
  external_exports
} from "./chunk-PAACUTJO.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/core/nodes/registry.ts
init_esm();

// src/core/nodes/definitions/image.node.ts
init_esm();

// src/core/nodes/base.ts
init_esm();
function defineNode(definition) {
  return definition;
}
__name(defineNode, "defineNode");

// src/core/nodes/definitions/image.node.ts
var imageNode = defineNode({
  type: "image",
  title: "Image",
  description: "Represents an image payload used as a workflow input or intermediate artifact.",
  inputSchema: external_exports.object({
    imageBase64: external_exports.string(),
    mimeType: external_exports.string()
  }),
  outputSchema: external_exports.object({
    imageBase64: external_exports.string(),
    mimeType: external_exports.string()
  })
});

// src/core/nodes/definitions/llm.node.ts
init_esm();
var llmNode = defineNode({
  type: "llm",
  title: "LLM",
  description: "Requests an LLM completion with optional images and provider selection constraints.",
  inputSchema: external_exports.object({
    prompt: external_exports.string(),
    images: external_exports.array(
      external_exports.object({
        imageBase64: external_exports.string(),
        mimeType: external_exports.string()
      })
    ).optional(),
    config: external_exports.object({
      model: external_exports.string(),
      temperature: external_exports.number(),
      providers: external_exports.array(external_exports.enum(["fal", "replicate", "wavespeed"]))
    })
  }),
  outputSchema: external_exports.object({
    text: external_exports.string(),
    providerUsed: external_exports.string()
  })
});

// src/core/nodes/definitions/prompt.node.ts
init_esm();
var promptNode = defineNode({
  type: "prompt",
  title: "Prompt",
  description: "Represents raw user text used as a prompt input.",
  inputSchema: external_exports.object({
    text: external_exports.string()
  }),
  outputSchema: external_exports.object({
    text: external_exports.string()
  })
});

// src/core/nodes/registry.ts
var nodeDefinitions = {
  prompt: promptNode,
  image: imageNode,
  llm: llmNode
};
function nonEmptyArray(arr) {
  if (arr.length === 0) {
    throw new Error("Node registry must include at least one node definition.");
  }
  return arr;
}
__name(nonEmptyArray, "nonEmptyArray");
var nodeTypeSchema = external_exports.enum(
  nonEmptyArray(Object.keys(nodeDefinitions))
);
var NodeRegistry = class {
  static {
    __name(this, "NodeRegistry");
  }
  constructor(definitions) {
    this.definitions = definitions;
  }
  listTypes() {
    return Object.keys(this.definitions);
  }
  get(type) {
    const def = this.definitions[type];
    if (!def) {
      throw new Error(`Unknown node type: ${String(type)}`);
    }
    return def;
  }
  parseInput(type, input) {
    return this.get(type).inputSchema.parse(input);
  }
  parseOutput(type, output) {
    return this.get(type).outputSchema.parse(output);
  }
};
var nodeRegistry = new NodeRegistry(nodeDefinitions);

export {
  nodeTypeSchema,
  nodeRegistry
};
//# sourceMappingURL=chunk-7YAVUQQN.mjs.map
