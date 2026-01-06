import type { NodeType } from "../core/nodes/registry";
import type { Workflow } from "../core/workflow/workflow.schema";

/**
 * Execution-layer types .
 *
 * These are intentionally independent from any provider/runtime specifics.
 * They describe what the orchestrator returns and how results are stored.
 */

export type ExecutionStatus = "running" | "completed" | "failed";

/**
 * Stores outputs keyed by nodeId.
 *
 * Note: outputs are `unknown` at this layer because a workflow can contain
 * heterogeneous node types. Type safety is enforced at the node boundary:
 * - node task validates outputs using the node's `outputSchema`
 * - orchestrator stores only validated outputs
 */
export interface ExecutionContext {
  readonly outputsByNodeId: Record<string, unknown>;
}

export interface NodeExecutionResult {
  readonly nodeId: string;
  readonly type: NodeType;
  readonly startedAt: string; // ISO timestamp
  readonly finishedAt: string; // ISO timestamp
  readonly input: unknown;
  readonly output: unknown;
}

export interface ExecutionRun {
  readonly runId: string;
  readonly status: ExecutionStatus;
  readonly startedAt: string; // ISO timestamp
  readonly finishedAt?: string; // ISO timestamp
  readonly workflow: Workflow;
  readonly executionOrder: string[];
  readonly context: ExecutionContext;
  readonly nodeResults: NodeExecutionResult[];
}

