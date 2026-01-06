import {
  nodeTypeSchema
} from "./chunk-7YAVUQQN.mjs";
import {
  external_exports
} from "./chunk-PAACUTJO.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/core/workflow/workflow.schema.ts
init_esm();
var workflowNodeSchema = external_exports.object({
  id: external_exports.string().min(1, "Node id must be a non-empty string."),
  type: nodeTypeSchema,
  input: external_exports.unknown()
});
var workflowEdgeSchema = external_exports.object({
  from: external_exports.string().min(1, "Edge.from must be a non-empty string."),
  to: external_exports.string().min(1, "Edge.to must be a non-empty string.")
});
var workflowSchema = external_exports.object({
  nodes: external_exports.array(workflowNodeSchema),
  edges: external_exports.array(workflowEdgeSchema)
}).superRefine((workflow, ctx) => {
  const ids = workflow.nodes.map((n) => n.id);
  const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `Duplicate node ids are not allowed: ${Array.from(new Set(duplicates)).join(", ")}`,
      path: ["nodes"]
    });
  }
  const idSet = new Set(ids);
  for (let i = 0; i < workflow.edges.length; i++) {
    const e = workflow.edges[i];
    if (!idSet.has(e.from)) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: `Edge.from references unknown node id "${e.from}".`,
        path: ["edges", i, "from"]
      });
    }
    if (!idSet.has(e.to)) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: `Edge.to references unknown node id "${e.to}".`,
        path: ["edges", i, "to"]
      });
    }
  }
});

// src/core/workflow/dag.ts
init_esm();
var WorkflowDagError = class extends Error {
  constructor() {
    super(...arguments);
    this.name = "WorkflowDagError";
  }
  static {
    __name(this, "WorkflowDagError");
  }
};
function buildAdjacency(nodes, edges) {
  const idSet = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    if (idSet.has(n.id)) {
      throw new WorkflowDagError(`Duplicate node id "${n.id}" detected.`);
    }
    idSet.add(n.id);
  }
  const adjacency = /* @__PURE__ */ new Map();
  const indegree = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    adjacency.set(n.id, /* @__PURE__ */ new Set());
    indegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!idSet.has(e.from)) {
      throw new WorkflowDagError(`Edge.from references unknown node id "${e.from}".`);
    }
    if (!idSet.has(e.to)) {
      throw new WorkflowDagError(`Edge.to references unknown node id "${e.to}".`);
    }
    if (e.from === e.to) {
      throw new WorkflowDagError(`Self-referential edge detected at node "${e.from}" (cycle).`);
    }
    const neighbors = adjacency.get(e.from);
    if (!neighbors.has(e.to)) {
      neighbors.add(e.to);
      indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
    }
  }
  return { adjacency, indegree, idSet };
}
__name(buildAdjacency, "buildAdjacency");
function findCyclePath(adjacency) {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = /* @__PURE__ */ new Map();
  const parent = /* @__PURE__ */ new Map();
  for (const nodeId of adjacency.keys()) {
    color.set(nodeId, WHITE);
    parent.set(nodeId, null);
  }
  const stack = [];
  const dfs = /* @__PURE__ */ __name((u) => {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adjacency.get(u) ?? []) {
      const vColor = color.get(v) ?? WHITE;
      if (vColor === WHITE) {
        parent.set(v, u);
        const cycle = dfs(v);
        if (cycle) return cycle;
      } else if (vColor === GRAY) {
        const idx = stack.lastIndexOf(v);
        const cycle = stack.slice(idx);
        cycle.push(v);
        return cycle;
      }
    }
    stack.pop();
    color.set(u, BLACK);
    return null;
  }, "dfs");
  for (const nodeId of adjacency.keys()) {
    if ((color.get(nodeId) ?? WHITE) === WHITE) {
      const cycle = dfs(nodeId);
      if (cycle) return cycle;
    }
  }
  return null;
}
__name(findCyclePath, "findCyclePath");
function topologicallySortNodeIds(nodes, edges) {
  const { adjacency, indegree } = buildAdjacency(nodes, edges);
  const queue = [];
  for (const [nodeId, deg] of indegree.entries()) {
    if (deg === 0) queue.push(nodeId);
  }
  const order = [];
  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);
    for (const v of adjacency.get(u) ?? []) {
      const nextDeg = (indegree.get(v) ?? 0) - 1;
      indegree.set(v, nextDeg);
      if (nextDeg === 0) queue.push(v);
    }
  }
  if (order.length !== nodes.length) {
    const cycle = findCyclePath(adjacency);
    if (cycle) {
      throw new WorkflowDagError(`Cycle detected in workflow DAG: ${cycle.join(" -> ")}`);
    }
    throw new WorkflowDagError("Cycle detected in workflow DAG.");
  }
  return order;
}
__name(topologicallySortNodeIds, "topologicallySortNodeIds");

export {
  workflowSchema,
  topologicallySortNodeIds
};
//# sourceMappingURL=chunk-IV3I7AKL.mjs.map
