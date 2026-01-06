export type RunStatus = "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELED";

export type ExecutionOverlay = {
  workflowRunId: string;
  status: RunStatus;
  nodeStates: Record<
    string,
    {
      status: RunStatus;
      provider?: string;
      startedAt?: string;
      finishedAt?: string;
      error?: string;
    }
  >;
};

export type WorkflowRunDetails = {
  id: string;
  status: RunStatus;
  workflowId: string;
  triggerRunId?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  context?: unknown;
  nodeRuns: Array<{
    nodeId: string;
    nodeType: string;
    status: RunStatus;
    provider?: string | null;
    input?: unknown;
    output?: unknown;
    logs?: unknown;
    error?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
  }>;
};

export function buildExecutionOverlay(run: WorkflowRunDetails): ExecutionOverlay {
  const nodeStates: ExecutionOverlay["nodeStates"] = {};
  for (const nr of run.nodeRuns ?? []) {
    nodeStates[nr.nodeId] = {
      status: nr.status,
      provider: nr.provider ?? undefined,
      startedAt: nr.startedAt ?? undefined,
      finishedAt: nr.finishedAt ?? undefined,
      error: nr.error ?? undefined,
    };
  }
  return { workflowRunId: run.id, status: run.status, nodeStates };
}

export function isTerminal(status: RunStatus) {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELED";
}

