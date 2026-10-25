type WindowRecord = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  dentalRateLimits?: Map<string, WindowRecord>;
  dentalDuplicates?: Map<string, number>;
};

const rateLimits = globalStore.dentalRateLimits ?? new Map<string, WindowRecord>();
const duplicates = globalStore.dentalDuplicates ?? new Map<string, number>();
globalStore.dentalRateLimits = rateLimits;
globalStore.dentalDuplicates = duplicates;

export function checkRateLimit(key: string, max = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  if (rateLimits.size > 1000) {
    for (const [entry, record] of rateLimits) {
      if (record.resetAt <= now) rateLimits.delete(entry);
    }
  }
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    if (!current && rateLimits.size >= 10_000) return false;
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

export function isDuplicate(key: string, windowMs = 2 * 60_000) {
  const now = Date.now();
  const previous = duplicates.get(key);
  if (previous && previous > now - windowMs) return true;

  if (duplicates.size > 500) {
    for (const [entry, timestamp] of duplicates) {
      if (timestamp < now - windowMs) duplicates.delete(entry);
    }
  }
  if (!duplicates.has(key) && duplicates.size >= 10_000) return true;
  duplicates.set(key, now);
  return false;
}

export function releaseDuplicate(key: string) {
  duplicates.delete(key);
}
