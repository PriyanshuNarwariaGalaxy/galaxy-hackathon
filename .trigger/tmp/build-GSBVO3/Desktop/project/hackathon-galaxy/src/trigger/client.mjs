import {
  configure
} from "../../../../../chunk-4NPKIL63.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// src/trigger/client.ts
init_esm();
var configured = false;
function configureTriggerClient() {
  if (configured) return;
  const accessToken = process.env.TRIGGER_SECRET_KEY;
  if (!accessToken) {
    throw new Error(
      "Missing TRIGGER_SECRET_KEY. Set it in your environment before triggering tasks."
    );
  }
  const rawBaseURL = process.env.TRIGGER_API_URL?.trim();
  if (rawBaseURL && /your-trigger-instance\.com/i.test(rawBaseURL)) {
    throw new Error(
      'TRIGGER_API_URL is set to a placeholder ("your-trigger-instance.com"). Remove it to use Trigger Cloud, or set it to your real Trigger API base URL.'
    );
  }
  configure({
    // If unset, Trigger defaults to https://api.trigger.dev
    baseURL: rawBaseURL,
    accessToken
  });
  configured = true;
}
__name(configureTriggerClient, "configureTriggerClient");
export {
  configureTriggerClient
};
//# sourceMappingURL=client.mjs.map
