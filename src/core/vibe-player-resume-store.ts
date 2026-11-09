import type {
  VibePlayerResumeContext,
  VibePlayerResumeStore,
} from "./vibe-player-types";

export interface VibePlayerMemoryResumeStoreOptions {
  entries?: Readonly<Record<string, number>>;
  /**
   * Sources shorter than this (seconds) are not saved; a save clears them.
   * Applies when the save knows the duration.
   */
  minDurationSeconds?: number;
  /** Positions before this (seconds) are not saved; a save clears them. */
  minPositionSeconds?: number;
}

export interface VibePlayerResumeStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface VibePlayerLocalStorageResumeStoreOptions {
  keyPrefix?: string;
  /**
   * Sources shorter than this (seconds) are not saved; a save clears them.
   * Applies when the save knows the duration.
   */
  minDurationSeconds?: number;
  /** Positions before this (seconds) are not saved; a save clears them. */
  minPositionSeconds?: number;
  storage?: VibePlayerResumeStorage | null;
}

interface ResumeMinimums {
  minDurationSeconds?: number | undefined;
  minPositionSeconds?: number | undefined;
}

const defaultResumeKeyPrefix = "vibe-player:resume:";

export function createMemoryVibePlayerResumeStore(
  options: VibePlayerMemoryResumeStoreOptions = {}
): VibePlayerResumeStore {
  const values = new Map<string, number>();
  for (const [sourceId, seconds] of Object.entries(options.entries ?? {})) {
    const normalized = normalizeResumeSeconds(seconds, options);
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
    set(sourceId, seconds, context) {
      const normalized = normalizeResumeSeconds(seconds, options, context);
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
      const normalized = normalizeResumeSeconds(Number(rawValue), options);
      if (rawValue !== null && normalized === null) {
        storage?.removeItem(key);
      }
      return normalized;
    },
    set(sourceId, seconds, context) {
      const key = createResumeStorageKey(keyPrefix, sourceId);
      const normalized = normalizeResumeSeconds(seconds, options, context);
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

/** A position worth resuming, or null when the store should clear it. */
function normalizeResumeSeconds(
  seconds: number,
  { minDurationSeconds = 0, minPositionSeconds = 0 }: ResumeMinimums,
  context?: VibePlayerResumeContext
): number | null {
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    return null;
  }
  const duration = context?.duration ?? 0;
  const tooShort =
    Number.isFinite(duration) && duration > 0 && duration < minDurationSeconds;
  return tooShort || seconds < minPositionSeconds ? null : seconds;
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
