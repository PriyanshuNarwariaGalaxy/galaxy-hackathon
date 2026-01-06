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

  const rawBaseURL = process.env.TRIGGER_API_URL?.trim();
  if (rawBaseURL && /your-trigger-instance\.com/i.test(rawBaseURL)) {
    throw new Error(
      'TRIGGER_API_URL is set to a placeholder ("your-trigger-instance.com"). Remove it to use Trigger Cloud, or set it to your real Trigger API base URL.',
    );
  }

  configure({
    // If unset, Trigger defaults to https://api.trigger.dev
    baseURL: rawBaseURL,
    accessToken,
  });

  configured = true;
}

