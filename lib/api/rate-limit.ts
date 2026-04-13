const LIMIT = 100;
const WINDOW_MS = 60_000;

type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

export function checkRateLimit(keyId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const window = store.get(keyId);

  if (!window || now >= window.resetAt) {
    store.set(keyId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (window.count >= LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  window.count++;
  return { allowed: true, remaining: LIMIT - window.count };
}

/** Only for use in tests. */
export function _resetForTesting(): void {
  store.clear();
}
