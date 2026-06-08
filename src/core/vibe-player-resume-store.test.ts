import { describe, expect, it } from "vitest";
import {
  createLocalStorageVibePlayerResumeStore,
  createMemoryVibePlayerResumeStore,
  type VibePlayerResumeStorage,
} from "./vibe-player-resume-store";

function createTestStorage(): {
  entries: Map<string, string>;
  storage: VibePlayerResumeStorage;
} {
  const entries = new Map<string, string>();
  return {
    entries,
    storage: {
      getItem(key) {
        return entries.get(key) ?? null;
      },
      removeItem(key) {
        entries.delete(key);
      },
      setItem(key, value) {
        entries.set(key, value);
      },
    },
  };
}

describe("vibe-player-resume-store", () => {
  it("creates an in-memory resume store with normalized values", () => {
    const store = createMemoryVibePlayerResumeStore({
      entries: {
        invalid: -1,
        valid: 42,
      },
    });

    expect(store.get("valid")).toBe(42);
    expect(store.get("invalid")).toBeNull();

    store.set("valid", 12.5);
    store.set("zero", 0);
    expect(store.get("valid")).toBe(12.5);
    expect(store.get("zero")).toBeNull();

    store.clear("valid");
    expect(store.get("valid")).toBeNull();
  });

  it("persists resume values through an injected storage object", () => {
    const { entries, storage } = createTestStorage();
    const store = createLocalStorageVibePlayerResumeStore({
      keyPrefix: "test:",
      storage,
    });

    store.set("video/1", 88);
    expect(entries.get("test:video%2F1")).toBe("88");
    expect(store.get("video/1")).toBe(88);

    store.clear("video/1");
    expect(store.get("video/1")).toBeNull();
    expect(entries.has("test:video%2F1")).toBe(false);
  });

  it("removes invalid local storage values instead of persisting them", () => {
    const { entries, storage } = createTestStorage();
    const store = createLocalStorageVibePlayerResumeStore({ storage });

    store.set("video", 34);
    store.set("video", Number.NaN);
    expect(entries.has("vibe-player:resume:video")).toBe(false);

    entries.set("vibe-player:resume:video", "not-a-number");
    expect(store.get("video")).toBeNull();
    expect(entries.has("vibe-player:resume:video")).toBe(false);
  });

  it("is a no-op when browser storage is unavailable", () => {
    const store = createLocalStorageVibePlayerResumeStore({ storage: null });

    expect(store.get("missing")).toBeNull();
    store.set("missing", 10);
    store.clear("missing");
    expect(store.get("missing")).toBeNull();
  });
});
