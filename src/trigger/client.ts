import { configure } from "@trigger.dev/sdk/v3";

/**
 * Trigger.dev API client configuration.
 *
 * Trigger.dev will also auto-configure itself from environment variables, but
 * we keep this explicit initializer so:
 * - local scripts (example usage) can configure deterministically
 * - the orchestrator/node tasks can be imported in isolation without side effects
 *
 * Required env:
 * - TRIGGER_SECRET_KEY: your Trigger.dev project secret key
 * Optional env:
 * - TRIGGER_API_URL: override API base URL (defaults to https://api.trigger.dev)
 */

let configured = false;

export function configureTriggerClient() {
  if (configured) return;

  const accessToken = process.env.TRIGGER_SECRET_KEY;
  if (!accessToken) {
    throw new Error(
      "Missing TRIGGER_SECRET_KEY. Set it in your environment before triggering tasks.",
    );
  }

  configure({
    baseURL: process.env.TRIGGER_API_URL,
    accessToken,
  });

  configured = true;
}

