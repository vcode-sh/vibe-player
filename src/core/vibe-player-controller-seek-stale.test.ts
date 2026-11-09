import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerAnalyticsEvent } from "./vibe-player-types";

async function createStalePlayer() {
  const adapter = new TestAdapter();
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
  });
  await controller.load(fileSource);
  const progress = (currentTime: number) =>
    adapter.emit("timeupdate", {
      currentTime,
      paused: false,
      readyState: "playing",
    });
  const seeks = () =>
    analytics
      .filter((event) => event.type === "seek")
      .map(({ currentTime, initiator }) => ({ currentTime, initiator }));
  return { adapter, controller, progress, seeks };
}

describe("controller seeks the provider never reaches", () => {
  it("reports a media seek near the target of a rejected controller seek", async () => {
    const { adapter, controller, progress, seeks } = await createStalePlayer();
    progress(10);
    vi.spyOn(adapter, "seekTo").mockRejectedValueOnce(new Error("Gone"));
    await expect(controller.seekTo(37)).rejects.toThrow("Gone");

    adapter.emit("seeking", { currentTime: 37.2, readyState: "buffering" });

    expect(seeks()).toEqual([{ currentTime: 37.2, initiator: "media" }]);
    await controller.teardown();
  });

  it("reports a media seek near a stale target once playback continued elsewhere", async () => {
    const { adapter, controller, progress, seeks } = await createStalePlayer();
    progress(10);
    // The provider accepts the seek but never goes there.
    vi.spyOn(adapter, "seekTo").mockResolvedValueOnce();
    await controller.seekTo(37);
    progress(10.25);
    progress(10.5);

    adapter.emit("seeking", { currentTime: 37.2, readyState: "buffering" });

    expect(seeks()).toEqual([
      { currentTime: 37, initiator: "controller" },
      { currentTime: 37.2, initiator: "media" },
    ]);
    await controller.teardown();
  });

  it("reports a media seek near a stale target once a seek finished elsewhere", async () => {
    const { adapter, controller, progress, seeks } = await createStalePlayer();
    progress(10);
    vi.spyOn(adapter, "seekTo").mockResolvedValueOnce();
    await controller.seekTo(37);
    // The provider settles a seek somewhere nobody asked for.
    adapter.emit("seeked", { currentTime: 12, readyState: "ready" });

    adapter.emit("seeking", { currentTime: 37.2, readyState: "buffering" });

    expect(seeks().at(-1)).toEqual({ currentTime: 37.2, initiator: "media" });
    await controller.teardown();
  });

  it("still treats one late progress report as the old position", async () => {
    const { adapter, controller, progress, seeks } = await createStalePlayer();
    progress(10);
    await controller.seekTo(37);
    // Queued before the seek, so it still reports where playback was.
    progress(10.25);
    adapter.emit("seeking", { currentTime: 37, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 37, readyState: "playing" });

    expect(seeks()).toEqual([{ currentTime: 37, initiator: "controller" }]);
    await controller.teardown();
  });
});
