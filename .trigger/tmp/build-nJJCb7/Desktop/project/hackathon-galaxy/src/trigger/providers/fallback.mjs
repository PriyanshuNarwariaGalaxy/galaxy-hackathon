import {
  logger
} from "../../../../../../chunk-4NPKIL63.mjs";
import "../../../../../../chunk-SZ6GL6S4.mjs";
import {
  __name,
  init_esm
} from "../../../../../../chunk-3VTTNDYQ.mjs";

// src/trigger/providers/fallback.ts
init_esm();
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function withTimeout(promise, timeoutMs, label) {
  if (timeoutMs <= 0) return promise;
  let t;
  const timeoutPromise = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms (${label})`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (t) clearTimeout(t);
  });
}
__name(withTimeout, "withTimeout");
async function executeWithFallback(opts, execute) {
  const attempts = [];
  const providers = opts.providers ?? [];
  if (providers.length === 0) {
    throw new Error("No providers specified for fallback execution.");
  }
  const tries = Math.max(1, opts.retryPerProvider);
  for (const provider of providers) {
    for (let attempt = 1; attempt <= tries; attempt++) {
      const startedAt = nowIso();
      logger.info("Provider attempt start", { provider, attempt });
      try {
        const output = await withTimeout(
          execute(provider),
          opts.timeoutMs,
          `provider=${provider} attempt=${attempt}`
        );
        const finishedAt = nowIso();
        attempts.push({ provider, attempt, startedAt, finishedAt, ok: true });
        logger.info("Provider attempt success", { provider, attempt });
        return { output, providerUsed: provider, attempts };
      } catch (err) {
        const finishedAt = nowIso();
        const message = err instanceof Error ? err.message : String(err);
        attempts.push({ provider, attempt, startedAt, finishedAt, ok: false, error: message });
        logger.warn("Provider attempt failed", { provider, attempt, error: message });
      }
    }
  }
  throw new Error(
    `All providers failed. Attempts: ${attempts.map((a) => `${a.provider}#${a.attempt}:${a.ok ? "ok" : "fail"}`).join(", ")}`
  );
}
__name(executeWithFallback, "executeWithFallback");
export {
  executeWithFallback
};
//# sourceMappingURL=fallback.mjs.map
