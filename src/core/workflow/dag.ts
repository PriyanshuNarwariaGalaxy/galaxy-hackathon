import type { WorkflowEdge, WorkflowNode } from "./workflow.schema";

/**
 * DAG utilities for workflow execution planning.
 *
 * IMPORTANT:
 * - This is NOT execution.
 * - It only computes a valid topological order (node ids) given nodes + edges.
 * - It detects cycles and throws meaningful errors.
 */

export class WorkflowDagError extends Error {
  override name = "WorkflowDagError";
}

function buildAdjacency(
  nodes: ReadonlyArray<WorkflowNode>,
  edges: ReadonlyArray<WorkflowEdge>,
) {
  const idSet = new Set<string>();
  for (const n of nodes) {
    if (idSet.has(n.id)) {
      throw new WorkflowDagError(`Duplicate node id "${n.id}" detected.`);
    }
    idSet.add(n.id);
  }

  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  for (const n of nodes) {
    adjacency.set(n.id, new Set());
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

    const neighbors = adjacency.get(e.from)!;
    // Ignore duplicate edges to keep indegree correct.
    if (!neighbors.has(e.to)) {
      neighbors.add(e.to);
      indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
    }
  }

  return { adjacency, indegree, idSet };
}

function findCyclePath(adjacency: Map<string, Set<string>>): string[] | null {
  // Classic DFS with colors to extract one cycle path for debugging.
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const nodeId of adjacency.keys()) {
    color.set(nodeId, WHITE);
    parent.set(nodeId, null);
  }

  const stack: string[] = [];

  const dfs = (u: string): string[] | null => {
    color.set(u, GRAY);
    stack.push(u);

    for (const v of adjacency.get(u) ?? []) {
      const vColor = color.get(v) ?? WHITE;
      if (vColor === WHITE) {
        parent.set(v, u);
        const cycle = dfs(v);
        if (cycle) return cycle;
      } else if (vColor === GRAY) {
        // Found back edge u -> v. Extract cycle from stack.
        const idx = stack.lastIndexOf(v);
        const cycle = stack.slice(idx);
        cycle.push(v); // close the loop
        return cycle;
      }
    }

    stack.pop();
    color.set(u, BLACK);
    return null;
  };

  for (const nodeId of adjacency.keys()) {
    if ((color.get(nodeId) ?? WHITE) === WHITE) {
      const cycle = dfs(nodeId);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Returns node ids in a valid execution order (topological order).
 *
 * Throws:
 * - WorkflowDagError if an edge references unknown ids
 * - WorkflowDagError if there is a cycle
 */
export function topologicallySortNodeIds(
  nodes: ReadonlyArray<WorkflowNode>,
  edges: ReadonlyArray<WorkflowEdge>,
): string[] {
  const { adjacency, indegree } = buildAdjacency(nodes, edges);

  // Kahn's algorithm.
  const queue: string[] = [];
  for (const [nodeId, deg] of indegree.entries()) {
    if (deg === 0) queue.push(nodeId);
  }

  const order: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
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

