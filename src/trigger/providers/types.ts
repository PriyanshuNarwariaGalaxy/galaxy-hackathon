// Phase 3 (current): we only support a single provider.
// Keep this as a union so expanding to multiple providers later is easy.
export type ProviderId = "fal";

export type ProviderAttemptLog = {
  provider: ProviderId;
  attempt: number;
  startedAt: string;
  finishedAt?: string;
  ok: boolean;
  error?: string;
};

export type FallbackOptions = {
  providers: ProviderId[];
  retryPerProvider: number; // e.g. 1 = try once, 2 = try twice per provider
  timeoutMs: number;
};

