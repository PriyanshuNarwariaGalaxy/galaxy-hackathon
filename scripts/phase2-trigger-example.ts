import { runs, tasks } from "@trigger.dev/sdk/v3";

import { configureTriggerClient } from "../src/trigger/client";
import { orchestratorTask } from "../src/trigger/orchestrator.task";

/**
 * Example usage (Phase 2):
 * Triggers the orchestrator with a workflow payload.
 *
 * Run:
 *   TRIGGER_SECRET_KEY=... npm run phase2:example
 *
 * Notes:
 * - This triggers Trigger.dev over the network. It requires valid Trigger.dev credentials.
 * - `triggerAndWait()` can only be called from inside a `task.run()` context.
 *   So in a standalone script we use `trigger()` and then `runs.poll()` to wait.
 */

async function main() {
  configureTriggerClient();

  const workflow = {
    nodes: [
      { id: "prompt_1", type: "prompt", input: { text: "Hello" } },
      {
        id: "llm_1",
        type: "llm",
        input: {
          prompt: "Say hi back",
          config: { model: "mock-model", temperature: 0.2, providers: ["fal"] },
        },
      },
    ],
    edges: [{ from: "prompt_1", to: "llm_1" }],
  };

  const handle = await tasks.trigger<typeof orchestratorTask>(orchestratorTask.id, {
    workflow,
  });

  console.log("Triggered orchestrator run:", handle);

  const polled = await runs.poll(handle, { pollIntervalMs: 1000 });
  console.log("Run status:", polled.status);

  const final = await runs.retrieve(handle);
  console.log("Final status:", final.status);

  if (final.output !== undefined) {
    console.log("ExecutionRun output:", JSON.stringify(final.output, null, 2));
  } else {
    const maybeError = (final as any).error;
    if (maybeError !== undefined) {
      console.log("Run error:", JSON.stringify(maybeError, null, 2));
    } else {
      console.log("No output available on run yet.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

