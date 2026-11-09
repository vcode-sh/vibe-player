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

  it("persists across store instances without colliding encoded source IDs or prefixes", () => {
    const { entries, storage } = createTestStorage();
    const store = createLocalStorageVibePlayerResumeStore({
      keyPrefix: "test:",
      storage,
    });

    store.set("video/1", 88);
    store.set("video%2F1", 12.5);
    const otherStore = createLocalStorageVibePlayerResumeStore({
      keyPrefix: "other:",
      storage,
    });
    otherStore.set("video/1", 31);
    expect(entries.get("test:video%2F1")).toBe("88");
    expect(
      createLocalStorageVibePlayerResumeStore({
        keyPrefix: "test:",
        storage,
      }).get("video/1")
    ).toBe(88);

    store.clear("video/1");
    expect(store.get("video/1")).toBeNull();
    expect(entries.has("test:video%2F1")).toBe(false);
    expect(store.get("video%2F1")).toBe(12.5);
    expect(otherStore.get("video/1")).toBe(31);
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

const minimums = { minDurationSeconds: 120, minPositionSeconds: 10 };
const minimumStores = [
  ["memory", () => createMemoryVibePlayerResumeStore(minimums)],
  [
    "localStorage",
    () =>
      createLocalStorageVibePlayerResumeStore({
        ...minimums,
        storage: createTestStorage().storage,
      }),
  ],
] as const;
const progress = (duration: number) =>
  ({ duration, reason: "progress" }) as const;

describe("resume store minimums", () => {
  it.each(minimumStores)(
    "%s store clears positions before minPositionSeconds",
    (_name, create) => {
      const store = create();
      store.set("video", 30, progress(600));
      store.set("video", 9.5, progress(600));
      expect(store.get("video")).toBeNull();
      store.set("video", 10, progress(600));
      expect(store.get("video")).toBe(10);
    }
  );

  it.each(minimumStores)(
    "%s store clears sources shorter than minDurationSeconds",
    (_name, create) => {
      const store = create();
      store.set("clip", 30, progress(600));
      store.set("clip", 30, progress(119));
      expect(store.get("clip")).toBeNull();
      store.set("clip", 30, progress(120));
      expect(store.get("clip")).toBe(30);
      // An unknown duration, or a write without context, cannot be judged.
      store.set("other", 30, progress(0));
      store.set("plain", 30);
      expect(store.get("other")).toBe(30);
      expect(store.get("plain")).toBe(30);
    }
  );

  it("keeps every positive position when no minimum is set", () => {
    const store = createMemoryVibePlayerResumeStore();
    store.set("clip", 0.5, progress(3));
    expect(store.get("clip")).toBe(0.5);
  });

  it("drops seeded memory entries before minPositionSeconds", () => {
    const store = createMemoryVibePlayerResumeStore({
      entries: { early: 4, late: 40 },
      minPositionSeconds: 5,
    });
    expect(store.get("early")).toBeNull();
    expect(store.get("late")).toBe(40);
  });
});
