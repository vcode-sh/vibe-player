import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

function createResumeStore() {
  return { clear: () => undefined, get: () => 23, set: () => undefined };
}

describe("controller resume diagnostics", () => {
  it.each(["store", "seek"] as const)(
    "reports a resume %s failure during loading",
    async (boundary) => {
      const adapter = new TestAdapter();
      const cause = new Error(`Resume ${boundary} unavailable`);
      const resumeStore = createResumeStore();
      if (boundary === "store") {
        resumeStore.get = () => {
          throw cause;
        };
      } else {
        adapter.seekTo = () => Promise.reject(cause);
      }
      const onError = vi.fn();
      const controller = new VibePlayerController({
        adapterFactory: () => adapter,
        onError,
        resumeStore,
      });

      await expect(controller.load(fileSource)).rejects.toBe(cause);

      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-1" },
        error: {
          cause,
          message: `Resume ${boundary} unavailable`,
          phase: "load",
          sourceId: "video-1",
        },
        lastEvent: "error",
        snapshot: { readyState: "error" },
      });
      expect(onError).toHaveBeenCalledTimes(1);
      await controller.teardown();
    }
  );

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
