import { logger } from "@trigger.dev/sdk/v3";
import type { FallbackOptions, ProviderAttemptLog, ProviderId } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (timeoutMs <= 0) return promise;
  let t: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms (${label})`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (t) clearTimeout(t);
  });
}

/**
 * Provider fallback engine (Phase 3).
 *
 * - Tries providers in order.
 * - Retries each provider up to `retryPerProvider`.
 * - Applies a per-attempt timeout.
 * - Returns the first successful output and the provider used.
 *
 * This is runtime-agnostic: the caller supplies the provider-specific execute fn.
 */
export async function executeWithFallback<TOutput>(
  opts: FallbackOptions,
  execute: (provider: ProviderId) => Promise<TOutput>,
): Promise<{ output: TOutput; providerUsed: ProviderId; attempts: ProviderAttemptLog[] }> {
  const attempts: ProviderAttemptLog[] = [];

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
          `provider=${provider} attempt=${attempt}`,
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
    `All providers failed. Attempts: ${attempts
      .map((a) => `${a.provider}#${a.attempt}:${a.ok ? "ok" : "fail"}`)
      .join(", ")}`,
  );
}

