import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

function createResumeStore() {
  return { clear: () => undefined, get: () => 23, set: () => undefined };
}

describe("controller resume diagnostics", () => {
  it("does not seek to an infinite stored position before duration metadata arrives", async () => {
    const adapter = new TestAdapter();
    adapter.load = () => {
      adapter.emit("ready", { duration: 0, readyState: "ready" });
      return Promise.resolve();
    };
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      resumeStore: {
        ...createResumeStore(),
        get: () => Number.POSITIVE_INFINITY,
      },
    });
    try {
      await controller.load(fileSource);

      expect(adapter.calls).not.toContain("seek:Infinity");
      expect(controller.getState().snapshot).toMatchObject({
        currentTime: 0,
        readyState: "ready",
      });
    } finally {
      await controller.teardown();
    }
  });

  it("continues playback while reporting an unavailable resume store", async () => {
    const adapter = new TestAdapter();
    const cause = new Error("Resume store unavailable");
    const resumeStore = {
      ...createResumeStore(),
      get: () => {
        throw cause;
      },
    };
    const onError = vi.fn();
    const diagnostic = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
      onEvent: (event) => {
        if (event.type === "integrationerror") {
          diagnostic(event.error);
        }
      },
      resumeStore,
    });

    await controller.load(fileSource);
    await controller.play();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.getState().error).toBeNull();
    expect(diagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        cause,
        details: { operation: "resume-get" },
        phase: "integration",
        sourceId: "video-1",
      })
    );
    expect(adapter.calls).toContain("play");
    expect(controller.getState().snapshot.readyState).toBe("buffering");
    await controller.teardown();
  });

  it("reports a failed provider resume seek during loading", async () => {
    const adapter = new TestAdapter();
    const cause = new Error("Resume seek unavailable");
    adapter.seekTo = () => Promise.reject(cause);
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
      resumeStore: createResumeStore(),
    });

    await expect(controller.load(fileSource)).rejects.toBe(cause);

    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-1" },
      error: { cause, phase: "load", sourceId: "video-1" },
      lastEvent: "error",
      snapshot: { readyState: "error" },
    });
    expect(onError).toHaveBeenCalledTimes(1);
    await controller.teardown();
  });

  it("does not attribute a superseded resume rejection to the replacement source", async () => {
    const old = new TestAdapter();
    const current = new TestAdapter();
    let rejectResume: (cause: Error) => void = () => undefined;
    let started: () => void = () => undefined;
    const resumeStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    old.seekTo = () =>
      new Promise<void>((_resolve, reject) => {
        rejectResume = reject;
        started();
      });
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: (source) => (source.id === "video-1" ? old : current),
      onError,
      resumeStore: createResumeStore(),
    });
    const oldLoad = controller.load(fileSource);
    await resumeStarted;
    await controller.load({ ...fileSource, id: "video-2" });
    const cause = new Error("Old resume failed");
    const outcome = expect(oldLoad).rejects.toBe(cause);
    rejectResume(cause);
    await outcome;

    expect(onError).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-2" },
      error: null,
      lastEvent: "ready",
    });
    await controller.teardown();
  });
});
