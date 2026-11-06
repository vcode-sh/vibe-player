import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

describe("controller host callbacks", () => {
  afterEach(() => vi.useRealTimers());

  it("reports playback once and throttles progress to 250 millisecond intervals", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const adapter = new TestAdapter();
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const onEnded = vi.fn();
    const onQualityChange = vi.fn();
    const onProgress = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onEnded,
      onPause,
      onPlay,
      onProgress,
      onQualityChange,
    });
    await controller.load(fileSource);
    adapter.emit("play", { paused: false, readyState: "buffering" });
    adapter.emit("playing", { paused: false, readyState: "playing" });
    adapter.emit("timeupdate", { currentTime: 17 });
    vi.advanceTimersByTime(100);
    adapter.emit("timeupdate", { currentTime: 18 });
    vi.advanceTimersByTime(150);
    adapter.emit("timeupdate", { currentTime: 19 });
    adapter.emit("qualitychange", {
      qualityOptions: [
        { auto: true, id: "auto", label: "Auto", selected: true },
      ],
    });
    adapter.emit("pause", { paused: true, readyState: "ready" });
    adapter.emit("ended", { currentTime: 100, readyState: "ended" });

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onQualityChange).toHaveBeenCalledTimes(1);
    expect(
      onProgress.mock.calls.map(([state]) => state.snapshot.currentTime)
    ).toEqual([17, 19]);
    expect(onEnded).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({
          currentTime: 100,
          readyState: "ended",
        }),
      })
    );
    await controller.teardown();
  });

  it("does not call onPlay after telemetry stops the same source", async () => {
    const adapter = new TestAdapter();
    const onPlay = vi.fn();
    let stopped: Promise<void> | undefined;
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onEvent: (event) => {
        if (event.type === "play") {
          stopped = controller.stop();
        }
      },
      onPlay,
    });
    await controller.load(fileSource);
    adapter.emit("play", { paused: false, readyState: "playing" });
    await stopped;
    expect(onPlay).not.toHaveBeenCalled();
    expect(controller.getState().snapshot).toMatchObject({
      paused: true,
      readyState: "idle",
    });
    await controller.teardown();
  });
});
