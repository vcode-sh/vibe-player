import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

class FullscreenAdapter extends TestAdapter {
  readonly fullscreenError = new Error("Fullscreen denied");

  enterFullscreen(): Promise<void> {
    return Promise.reject(this.fullscreenError);
  }
}

class PictureInPictureAdapter extends TestAdapter {
  enterPictureInPicture(): Promise<void> {
    return Promise.reject(
      new DOMException("Picture-in-Picture is disabled.", "NotSupportedError")
    );
  }
}

describe("controller command diagnostics", () => {
  it("does not report a refused Picture-in-Picture request as an unloadable source", async () => {
    const onEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => new PictureInPictureAdapter(),
      onEvent,
    });
    await controller.load(fileSource);

    await expect(controller.enterPictureInPicture()).rejects.toMatchObject({
      name: "NotSupportedError",
    });

    const failures = onEvent.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === "commanderror");
    expect(failures).toMatchObject([
      { command: "enterPictureInPicture", error: { kind: "unknown" } },
    ]);
    await controller.teardown();
  });

  it("reports failed playback and restores the provider snapshot for a retry", async () => {
    const adapter = new TestAdapter();
    const cause = new Error("Decoder unavailable");
    adapter.playError = cause;
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await controller.load(fileSource);

    await expect(controller.play()).rejects.toBe(cause);

    expect(controller.getState()).toMatchObject({
      error: {
        cause,
        details: { command: "play" },
        message: "Decoder unavailable",
        phase: "playback",
        sourceId: "video-1",
      },
      snapshot: { paused: true, readyState: "ready" },
    });
    expect(onError).toHaveBeenCalledTimes(1);
    await controller.teardown();
  });

  it("reports an auxiliary action failure without claiming playback is unavailable", async () => {
    const adapter = new FullscreenAdapter();
    const onError = vi.fn();
    const onEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
      onEvent,
    });
    await controller.load(fileSource);
    adapter.emit("play", {
      currentTime: 47,
      paused: false,
      readyState: "playing",
    });

    await expect(controller.enterFullscreen()).rejects.toBe(
      adapter.fullscreenError
    );

    expect(controller.getState()).toMatchObject({
      error: null,
      snapshot: { currentTime: 47, paused: false, readyState: "playing" },
    });
    expect(onError).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "enterFullscreen",
        error: expect.objectContaining({
          cause: adapter.fullscreenError,
          message: "Fullscreen denied",
        }),
        source: fileSource,
        type: "commanderror",
      })
    );
    await controller.teardown();
  });

  it("rejects an obsolete command without attributing its error to the current source", async () => {
    const old = new TestAdapter();
    const current = new TestAdapter();
    let reject: (cause: Error) => void = () => undefined;
    old.setVolume = () =>
      new Promise<void>((_resolve, rejectPromise) => {
        reject = rejectPromise;
      });
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: (source) => (source.id === "video-1" ? old : current),
      onError,
    });
    await controller.load(fileSource);
    const pending = controller.setVolume(0.3);
    await controller.load({ ...fileSource, id: "video-2" });
    current.emit("play", {
      currentTime: 51,
      paused: false,
      readyState: "playing",
    });
    const cause = new Error("Old volume command rejected");
    const outcome = expect(pending).rejects.toBe(cause);
    reject(cause);
    await outcome;

    expect(onError).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-2" },
      error: null,
      snapshot: { currentTime: 51, paused: false, readyState: "playing" },
    });
    await controller.teardown();
  });

  it("reports each independently rejected auxiliary command on the same source", async () => {
    const adapter = new TestAdapter();
    const volumeFailure = new Error("Volume rejected");
    const rateFailure = new Error("Rate rejected");
    let rejectVolume: (cause: Error) => void = () => undefined;
    let rejectRate: (cause: Error) => void = () => undefined;
    adapter.setVolume = () =>
      new Promise<void>((_resolve, reject) => {
        rejectVolume = reject;
      });
    adapter.setPlaybackRate = () =>
      new Promise<void>((_resolve, reject) => {
        rejectRate = reject;
      });
    const onError = vi.fn();
    const onEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
      onEvent,
    });
    await controller.load(fileSource);
    const volume = controller.setVolume(0.3);
    const rate = controller.setPlaybackRate(1.5);
    const volumeOutcome = expect(volume).rejects.toBe(volumeFailure);
    rejectVolume(volumeFailure);
    await volumeOutcome;
    const rateOutcome = expect(rate).rejects.toBe(rateFailure);
    rejectRate(rateFailure);
    await rateOutcome;

    expect(onError).not.toHaveBeenCalled();
    const failures = onEvent.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === "commanderror");
    expect(failures).toMatchObject([
      {
        command: "setVolume",
        error: { cause: volumeFailure, sourceId: "video-1" },
      },
      {
        command: "setPlaybackRate",
        error: { cause: rateFailure, sourceId: "video-1" },
      },
    ]);
    expect(controller.getState().error).toBeNull();
    await controller.teardown();
  });
});
