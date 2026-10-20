import { env } from '../config/env.js';

const store = new Map();

export function getCache(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function setCache(key, value, ttlMinutes = env.CACHE_DURATION_MINUTES) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
  });
  return value;
}

export function clearCache() {
  store.clear();
}
