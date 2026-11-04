import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

describe("controller load observer ownership", () => {
  it("releases a subscription that replaces its source before subscribe returns", async () => {
    const previous = new TestAdapter();
    const current = new TestAdapter();
    const subscribe = previous.subscribe.bind(previous);
    const disposed = vi.fn();
    vi.spyOn(previous, "subscribe").mockImplementation((listener) => {
      const unsubscribe = subscribe(listener);
      previous.emit("ready", { readyState: "ready" });
      return () => {
        disposed();
        unsubscribe();
      };
    });
    const controller = new VibePlayerController({
      adapterFactory: (source) =>
        source.id === "video-1" ? previous : current,
    });
    let replacement: Promise<void> | undefined;
    const unsubscribe = controller.subscribe((state) => {
      if (
        state.currentSource?.id === "video-1" &&
        state.lastEvent === "ready"
      ) {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      }
    });
    try {
      await controller.mount(document.createElement("div"));
      await controller.load(fileSource);
      await replacement;
      current.emit("timeupdate", { currentTime: 12 });
      previous.emit("timeupdate", { currentTime: 77 });
      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-2" },
        snapshot: { currentTime: 12 },
      });
      expect(disposed).toHaveBeenCalledTimes(1);
      expect(previous.calls).not.toContain("mount:div");
    } finally {
      unsubscribe();
      await replacement;
      await controller.teardown();
      vi.restoreAllMocks();
    }
  });

  it("does not subscribe or mount an adapter replaced by its initial state observer", async () => {
    const previous = new TestAdapter();
    const current = new TestAdapter();
    const subscribe = vi.spyOn(previous, "subscribe");
    const controller = new VibePlayerController({
      adapterFactory: (source) =>
        source.id === "video-1" ? previous : current,
    });
    let replacement: Promise<void> | undefined;
    const unsubscribe = controller.subscribe((state) => {
      if (state.currentSource?.id === "video-1" && state.lastEvent === null) {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      }
    });
    try {
      await controller.mount(document.createElement("div"));
      await controller.load(fileSource);
      await replacement;

      expect(subscribe).not.toHaveBeenCalled();
      expect(previous.calls).not.toContain("mount:div");
      expect(previous.calls).not.toContain("load:video-1");
      expect(current.calls).toContain("mount:div");
      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-2" },
        snapshot: { readyState: "ready" },
      });
    } finally {
      unsubscribe();
      await replacement;
      await controller.teardown();
      subscribe.mockRestore();
    }
  });

  it("stops opened analytics and resume reads when a ready observer replaces the source", async () => {
    const previous = new TestAdapter();
    const current = new TestAdapter();
    const onAnalyticsEvent = vi.fn();
    const get = vi.fn(() => 23);
    const controller = new VibePlayerController({
      adapterFactory: (source) =>
        source.id === "video-1" ? previous : current,
      onAnalyticsEvent,
      resumeStore: { clear: () => undefined, get, set: () => undefined },
    });
    let replacement: Promise<void> | undefined;
    const unsubscribe = controller.subscribe((state) => {
      if (
        state.currentSource?.id === "video-1" &&
        state.lastEvent === "ready"
      ) {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      }
    });
    try {
      await controller.load(fileSource);
      await replacement;

      expect(onAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: "video-1", type: "opened" })
      );
      expect(get).toHaveBeenCalledExactlyOnceWith("video-2");
      expect(current.calls).toContain("seek:23");
      expect(controller.getState().currentSource?.id).toBe("video-2");
    } finally {
      unsubscribe();
      await replacement;
      await controller.teardown();
    }
  });

  it("does not read old resume state after opened analytics replaces the source", async () => {
    const previous = new TestAdapter();
    const current = new TestAdapter();
    const get = vi.fn(() => 23);
    let replacement: Promise<void> | undefined;
    const controller = new VibePlayerController({
      adapterFactory: (source) =>
        source.id === "video-1" ? previous : current,
      onAnalyticsEvent: (event) => {
        if (event.sourceId === "video-1" && event.type === "opened") {
          replacement ??= controller.load({ ...fileSource, id: "video-2" });
        }
      },
      resumeStore: { clear: () => undefined, get, set: () => undefined },
    });
    try {
      await controller.load(fileSource);
      await replacement;

      expect(get).toHaveBeenCalledExactlyOnceWith("video-2");
      expect(previous.calls).not.toContain("seek:23");
      expect(current.calls).toContain("seek:23");
    } finally {
      await replacement;
      await controller.teardown();
    }
  });
});
