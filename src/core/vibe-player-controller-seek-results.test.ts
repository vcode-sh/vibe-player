import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

function createDeferredSeek() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("controller seek outcomes", () => {
  it("clamps the dispatched seek before persisting and reporting the accepted target", async () => {
    const adapter = new TestAdapter();
    const store = { clear: vi.fn(), get: () => null, set: vi.fn() };
    const onAnalyticsEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent,
      resumeStore: store,
    });
    await controller.load(fileSource);

    await controller.seekTo(250);

    expect(adapter.calls).toContain("seek:100");
    expect(adapter.calls).not.toContain("seek:250");
    expect(controller.getState().snapshot.currentTime).toBe(100);
    expect(store.set).toHaveBeenLastCalledWith("video-1", 100, {
      duration: 100,
      reason: "seek",
    });
    expect(onAnalyticsEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentTime: 100, duration: 100, type: "seek" })
    );
    await controller.teardown();
  });

  it("uses the accepted target when the provider snapshot still reports the old position", async () => {
    const adapter = new TestAdapter();
    const seekTo = vi.spyOn(adapter, "seekTo").mockResolvedValue();
    const store = { clear: vi.fn(), get: () => null, set: vi.fn() };
    const onAnalyticsEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent,
      resumeStore: store,
    });
    try {
      await controller.load(fileSource);
      await controller.seekTo(37);

      expect(seekTo).toHaveBeenCalledExactlyOnceWith(37);
      expect(controller.getState().snapshot.currentTime).toBe(0);
      expect(store.set).toHaveBeenCalledExactlyOnceWith("video-1", 37, {
        duration: 100,
        reason: "seek",
      });
      expect(onAnalyticsEvent).toHaveBeenLastCalledWith({
        currentTime: 37,
        duration: 100,
        from: 0,
        initiator: "controller",
        provider: "file",
        sourceId: "video-1",
        type: "seek",
      });
    } finally {
      await controller.teardown();
      seekTo.mockRestore();
    }
  });

  it("does not pretend to seek a source without seeking capability", async () => {
    const adapter = new TestAdapter();
    adapter.capabilities.canSeek = false;
    const store = { clear: vi.fn(), get: () => null, set: vi.fn() };
    const onAnalyticsEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent,
      resumeStore: store,
    });
    await controller.load(fileSource);
    onAnalyticsEvent.mockClear();

    await controller.seekTo(42);

    expect(adapter.calls).not.toContain("seek:42");
    expect(store.set).not.toHaveBeenCalled();
    expect(onAnalyticsEvent).not.toHaveBeenCalled();
    await controller.teardown();
  });

  it("does not persist or report an old seek after a new source replaces it", async () => {
    const first = new TestAdapter();
    const second = new TestAdapter();
    const gate = createDeferredSeek();
    first.seekTo = () => gate.promise;
    const store = { clear: vi.fn(), get: () => null, set: vi.fn() };
    const onAnalyticsEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: (source) => (source.id === "video-1" ? first : second),
      onAnalyticsEvent,
      resumeStore: store,
    });
    await controller.load(fileSource);
    const oldSeek = controller.seekTo(37);
    await controller.load({ ...fileSource, id: "video-2" });
    onAnalyticsEvent.mockClear();
    gate.resolve();
    await oldSeek;

    expect(store.set).not.toHaveBeenCalled();
    expect(onAnalyticsEvent).not.toHaveBeenCalled();
    expect(controller.getState().currentSource?.id).toBe("video-2");
    await controller.teardown();
  });

  it.each(["state", "storage"] as const)(
    "stops old seek effects when a %s callback replaces the source",
    async (boundary) => {
      const first = new TestAdapter();
      const second = new TestAdapter();
      const onAnalyticsEvent = vi.fn();
      let replacement: Promise<void> | undefined;
      const replaceSource = () => {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      };
      const store = {
        clear: vi.fn(),
        get: () => null,
        set: vi.fn(() => {
          if (boundary === "storage") {
            replaceSource();
          }
        }),
      };
      const controller = new VibePlayerController({
        adapterFactory: (source) => (source.id === "video-1" ? first : second),
        onAnalyticsEvent,
        resumeStore: store,
      });
      await controller.load(fileSource);
      controller.subscribe((state) => {
        if (boundary === "state" && state.snapshot.currentTime === 37) {
          replaceSource();
        }
      });

      await controller.seekTo(37);
      await replacement;

      // A state listener sees the seek before it settled, so nothing saves;
      // a store that replaces the source then hears the old source close.
      expect(store.set.mock.calls).toEqual(
        boundary === "state"
          ? []
          : [
              ["video-1", 37, { duration: 100, reason: "seek" }],
              ["video-1", 37, { duration: 100, reason: "close" }],
            ]
      );
      expect(onAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: "video-1", type: "seek" })
      );
      expect(controller.getState().currentSource?.id).toBe("video-2");
      await controller.teardown();
    }
  );
});
