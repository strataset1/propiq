import { Redis } from "@upstash/redis";

const LIMIT = 100;
const WINDOW_SECONDS = 60;

// Lazy-initialise so the module can be imported in tests without crashing
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
  }
  return _redis;
}

export async function checkRateLimit(
  keyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const key = `rl:${keyId}`;

  // INCR is atomic — safe under concurrent requests
  const count = await redis.incr(key);
  if (count === 1) {
    // First request in window — set expiry
    await redis.expire(key, WINDOW_SECONDS);
  }

  const remaining = Math.max(0, LIMIT - count);
  return { allowed: count <= LIMIT, remaining };
}

/** Only for use in tests — overrides the Redis instance. */
export function _setRedisForTesting(instance: Redis): void {
  _redis = instance;
}
