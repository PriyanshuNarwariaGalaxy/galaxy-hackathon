import { defineConfig } from "@trigger.dev/sdk/v3";

/**
 *
 * This enables the Trigger.dev dev runner to discover and execute tasks in this repo.
 *
 *
 * Notes:
 * - We point Trigger at `src/trigger` which contains all orchestrator + node tasks.
 * - Keep all provider logic inside node tasks (or provider adapters), not in the orchestrator.
 */

export default defineConfig({
  project: "proj_jnrnmyrjllfxflkkeove",
  dirs: ["src/trigger"],
  runtime: "node",
  // Global max duration for task runs (seconds)
  maxDuration: 300,
  logLevel: "info",
  enableConsoleLogging: true,
});

