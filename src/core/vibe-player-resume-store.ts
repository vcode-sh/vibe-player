import type { VibePlayerResumeStore } from "./vibe-player-types";

export interface VibePlayerMemoryResumeStoreOptions {
  entries?: Readonly<Record<string, number>>;
}

export interface VibePlayerResumeStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface VibePlayerLocalStorageResumeStoreOptions {
  keyPrefix?: string;
  storage?: VibePlayerResumeStorage | null;
}

const defaultResumeKeyPrefix = "vibe-player:resume:";

export function createMemoryVibePlayerResumeStore(
  options: VibePlayerMemoryResumeStoreOptions = {}
): VibePlayerResumeStore {
  const values = new Map<string, number>();
  for (const [sourceId, seconds] of Object.entries(options.entries ?? {})) {
    const normalized = normalizeResumeSeconds(seconds);
    if (normalized !== null) {
      values.set(sourceId, normalized);
    }
  }
  return {
    clear(sourceId) {
      values.delete(sourceId);
    },
    get(sourceId) {
      return values.get(sourceId) ?? null;
    },
    set(sourceId, seconds) {
      const normalized = normalizeResumeSeconds(seconds);
      if (normalized === null) {
        values.delete(sourceId);
        return;
      }
      values.set(sourceId, normalized);
    },
  };
}

export function createLocalStorageVibePlayerResumeStore(
  options: VibePlayerLocalStorageResumeStoreOptions = {}
): VibePlayerResumeStore {
  const keyPrefix = options.keyPrefix ?? defaultResumeKeyPrefix;
  const storage = resolveResumeStorage(options.storage);
  return {
    clear(sourceId) {
      storage?.removeItem(createResumeStorageKey(keyPrefix, sourceId));
    },
    get(sourceId) {
      const key = createResumeStorageKey(keyPrefix, sourceId);
      const rawValue = storage?.getItem(key);
      const normalized = normalizeResumeSeconds(Number(rawValue));
      if (rawValue !== null && normalized === null) {
        storage?.removeItem(key);
      }
      return normalized;
    },
    set(sourceId, seconds) {
      const key = createResumeStorageKey(keyPrefix, sourceId);
      const normalized = normalizeResumeSeconds(seconds);
      if (normalized === null) {
        storage?.removeItem(key);
        return;
      }
      storage?.setItem(key, String(normalized));
    },
  };
}

function createResumeStorageKey(keyPrefix: string, sourceId: string): string {
  return `${keyPrefix}${encodeURIComponent(sourceId)}`;
}

function normalizeResumeSeconds(seconds: number): number | null {
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    return null;
  }
  return seconds;
}

function resolveResumeStorage(
  storage: VibePlayerResumeStorage | null | undefined
): VibePlayerResumeStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
