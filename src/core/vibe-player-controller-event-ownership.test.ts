import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import { playTestAdapter } from "./vibe-player-watched-test-helpers";

type Boundary = "none" | "state" | "storage";

/**
 * Plays 1.75 s of an 8 s source; `replace()` loads another one. A `storage`
 * boundary replaces from inside the store's first write.
 */
async function createOwnershipPlayer(boundary: Boundary) {
  const previous = new TestAdapter();
  const current = new TestAdapter();
  const saves: (number | string | undefined)[][] = [];
  let replacement: Promise<void> | undefined;
  const replace = () => {
    replacement ??= controller.load({ ...fileSource, id: "video-2" });
  };
  const onAnalyticsEvent = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: (source) => (source.id === "video-1" ? previous : current),
    onAnalyticsEvent,
    resumeStore: {
      clear: (sourceId) => {
        saves.push(["clear", sourceId]);
        if (boundary === "storage") {
          replace();
        }
      },
      get: () => null,
      set: (sourceId, seconds, context) => {
        saves.push([sourceId, seconds, context?.reason]);
        if (boundary === "storage") {
          replace();
        }
      },
    },
  });
  await controller.load(fileSource);
  previous.emit("durationchange", { duration: 8 });
  playTestAdapter(previous, 0, 1.75);
  const replaced = () => replacement;
  return { controller, onAnalyticsEvent, previous, replace, replaced, saves };
}

const savedProgress = [
  ["video-1", 2, "progress"],
  ["video-1", 2, "close"],
];

describe("controller event side-effect ownership", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Resume saves follow the provider's own event, before state listeners,
  // so a replacement never hides them; analytics run after state and stop.
  it.each([
    {
      boundary: "none",
      effect: "progress_25",
      event: "timeupdate",
      saves: [["video-1", 2, "progress"]],
    },
    {
      boundary: "state",
      effect: "progress_25",
      event: "timeupdate",
      saves: savedProgress,
    },
    {
      boundary: "storage",
      effect: "progress_25",
      event: "timeupdate",
      saves: savedProgress,
    },
    ...(["none", "state", "storage"] as const).map((boundary) => ({
      boundary,
      effect: "completed" as const,
      event: "ended" as const,
      saves: [["clear", "video-1"]],
    })),
  ] as const)(
    "stops $event analytics when a $boundary callback replaces the source",
    async ({ boundary, effect, event, saves }) => {
      vi.useFakeTimers();
      const player = await createOwnershipPlayer(boundary);
      player.controller.subscribe((state) => {
        if (boundary === "state" && state.lastEvent === event) {
          player.replace();
        }
      });

      // A quarter of the media played, or it ended.
      player.previous.emit(event, {
        currentTime: event === "timeupdate" ? 2 : 8,
        ...(event === "ended" ? { paused: true, readyState: "ended" } : {}),
      });
      await player.replaced();

      const reported = expect.objectContaining({
        sourceId: "video-1",
        type: effect,
      });
      expect(player.saves).toEqual(saves);
      if (boundary === "none") {
        expect(player.onAnalyticsEvent).toHaveBeenCalledWith(reported);
      } else {
        expect(player.onAnalyticsEvent).not.toHaveBeenCalledWith(reported);
        expect(player.controller.getState().currentSource?.id).toBe("video-2");
      }
      await player.controller.teardown();
    }
  );

  it("does not report an error superseded by subscriber source replacement", async () => {
    const previous = new TestAdapter();
    const current = new TestAdapter();
    const onError = vi.fn();
    let replacement: Promise<void> | undefined;
    const controller = new VibePlayerController({
      adapterFactory: (source) =>
        source.id === "video-1" ? previous : current,
      onError,
    });
    await controller.load(fileSource);
    controller.subscribe((state) => {
      if (state.lastEvent === "error") {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      }
    });

    previous.emit("error", { readyState: "error" });
    await replacement;

    expect(onError).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-2" },
      error: null,
      snapshot: { readyState: "ready" },
    });
    await controller.teardown();
  });
});
