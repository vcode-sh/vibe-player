import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

function createStore() {
  return { clear: vi.fn(), get: () => null, set: vi.fn() };
}

describe("controller host integration isolation", () => {
  it("disposes a playing source even when closed analytics throws", async () => {
    const adapter = new TestAdapter();
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent: (event) => {
        if (event.type === "closed") {
          throw new Error("Telemetry unavailable");
        }
      },
      onError,
    });
    await controller.load(fileSource);
    adapter.emit("play", { paused: false, readyState: "playing" });

    await controller.closeSource();

    expect(adapter.calls).toContain("unmount");
    expect(controller.getState().currentSource).toBeNull();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { operation: "analytics" },
        message: "Telemetry unavailable",
        sourceId: "video-1",
      })
    );
  });

  it.each(["set", "clear"] as const)(
    "keeps %s storage failures from suppressing playback analytics",
    async (operation) => {
      const adapter = new TestAdapter();
      const store = createStore();
      store[operation] = vi.fn(() => {
        throw new Error("Storage unavailable");
      });
      const onAnalyticsEvent = vi.fn();
      const onError = vi.fn();
      const controller = new VibePlayerController({
        adapterFactory: () => adapter,
        onAnalyticsEvent,
        onError,
        resumeStore: store,
      });
      await controller.load(fileSource);

      adapter.emit(operation === "set" ? "timeupdate" : "ended", {
        currentTime: operation === "set" ? 30 : 100,
        duration: 100,
        paused: false,
        readyState: operation === "set" ? "playing" : "ended",
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { operation: `resume-${operation}` },
          message: "Storage unavailable",
        })
      );
      expect(onAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: operation === "set" ? "progress_25" : "completed",
        })
      );
      expect(controller.getState().snapshot.readyState).toBe(
        operation === "set" ? "playing" : "ended"
      );
      await controller.teardown();
    }
  );

  it("continues notifying subscribers when one observer and diagnostics throw", async () => {
    const adapter = new TestAdapter();
    const onError = vi.fn(() => {
      throw new Error("Diagnostic observer unavailable");
    });
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await controller.load(fileSource);
    controller.subscribe(() => {
      throw new Error("State observer unavailable");
    });
    const observer = vi.fn();
    controller.subscribe(observer);

    adapter.emit("play", {
      currentTime: 17,
      paused: false,
      readyState: "playing",
    });

    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({ currentTime: 17, paused: false }),
      })
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.getState().snapshot.readyState).toBe("playing");
    await controller.teardown();
  });

  it("does not deliver old provider state after a subscriber starts playback", async () => {
    const adapter = new TestAdapter();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
    });
    await controller.load(fileSource);
    let play: Promise<void> | undefined;
    controller.subscribe((state) => {
      if (state.lastEvent === "timeupdate" && state.snapshot.paused) {
        play = controller.play();
      }
    });
    const observer = vi.fn();
    controller.subscribe(observer);

    adapter.emit("timeupdate", {
      currentTime: 10,
      paused: true,
      readyState: "ready",
    });
    await play;

    expect(observer).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        lastEvent: "play",
        snapshot: expect.objectContaining({
          currentTime: 10,
          paused: false,
          readyState: "buffering",
        }),
      })
    );
    expect(controller.getState().snapshot.paused).toBe(false);
    await controller.teardown();
  });
});
