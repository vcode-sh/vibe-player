import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createControllerHarness,
  fileSource,
  getAdapter,
} from "./vibe-player-controller-test-helpers";
import type { VibePlayerAnalyticsEvent } from "./vibe-player-types";
import { playTestAdapter } from "./vibe-player-watched-test-helpers";

function milestones(analytics: readonly VibePlayerAnalyticsEvent[]) {
  return analytics.filter((event) => event.type.startsWith("progress_"));
}

describe("VibePlayerController analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits session analytics once per milestone", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.emit("durationchange", { duration: 8 });

    adapter.emit("play", { currentTime: 0, paused: false });
    adapter.emit("play", { currentTime: 0, paused: false });
    playTestAdapter(adapter, 0, 8);
    adapter.emit("ended", { paused: true, readyState: "ended" });
    adapter.emit("ended", { paused: true, readyState: "ended" });
    await controller.teardown();

    expect(analytics.map((event) => event.type)).toEqual([
      "opened",
      "started",
      "progress_25",
      "progress_50",
      "progress_75",
      "completed",
      "closed",
    ]);
    expect(resumeCalls).toContain("clear:video-1");
    expect(analytics.find((event) => event.type === "started")).toEqual({
      currentTime: 0,
      duration: 8,
      provider: "file",
      sourceId: "video-1",
      type: "started",
    });
  });

  it("reports nothing for a jump without watching", async () => {
    const { adapters, analytics, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);

    adapter.emit("play", { currentTime: 0, paused: false });
    adapter.emit("timeupdate", { currentTime: 80, readyState: "playing" });
    playTestAdapter(adapter, 80, 80.75);

    expect(milestones(analytics)).toEqual([]);
    await controller.teardown();
  });

  it("reports a milestone once the playback watched that share", async () => {
    const { adapters, analytics, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.emit("durationchange", { duration: 8 });

    playTestAdapter(adapter, 0, 2);
    await controller.seekTo(6);
    playTestAdapter(adapter, 6, 8);
    await controller.seekTo(0);
    playTestAdapter(adapter, 0, 2);
    await controller.seekTo(2);
    playTestAdapter(adapter, 2, 4);

    const at = (type: string, currentTime: number) => ({
      currentTime,
      duration: 8,
      provider: "file",
      sourceId: "video-1",
      type,
    });
    expect(milestones(analytics)).toEqual([
      at("progress_25", 2),
      at("progress_50", 8),
      at("progress_75", 4),
    ]);
    await controller.teardown();
  });

  it.each([0, Number.POSITIVE_INFINITY])(
    "reports no milestone while the duration is %s",
    async (duration) => {
      const { adapters, analytics, controller } = createControllerHarness();
      await controller.load(fileSource);
      const adapter = getAdapter(adapters, 0);
      adapter.emit("durationchange", { duration });

      playTestAdapter(adapter, 0, 10);

      expect(milestones(analytics)).toEqual([]);
      await controller.teardown();
    }
  );

  it("rearms milestones for a new source without attributing them to the old session", async () => {
    const { adapters, analytics, controller } = createControllerHarness();
    await controller.load(fileSource);
    getAdapter(adapters, 0).emit("durationchange", { duration: 8 });
    playTestAdapter(getAdapter(adapters, 0), 0, 2);
    await controller.load({ ...fileSource, id: "video-2" });
    getAdapter(adapters, 1).emit("durationchange", { duration: 16 });
    // Another span than before, so leftover coverage would show.
    playTestAdapter(getAdapter(adapters, 1), 8, 12);

    expect(milestones(analytics)).toEqual([
      {
        currentTime: 2,
        duration: 8,
        provider: "file",
        sourceId: "video-1",
        type: "progress_25",
      },
      {
        currentTime: 12,
        duration: 16,
        provider: "file",
        sourceId: "video-2",
        type: "progress_25",
      },
    ]);
    await controller.teardown();
  });
});
