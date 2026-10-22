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
  it("persists and reports the finite position accepted by its adapter", async () => {
    const adapter = new TestAdapter();
    const seek = adapter.seekTo.bind(adapter);
    adapter.seekTo = (seconds) => seek(Math.max(0, Math.min(100, seconds)));
    const store = { clear: vi.fn(), get: () => null, set: vi.fn() };
    const onAnalyticsEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent,
      resumeStore: store,
    });
    await controller.load(fileSource);

    await controller.seekTo(250);

    expect(controller.getState().snapshot.currentTime).toBe(100);
    expect(store.set).toHaveBeenLastCalledWith("video-1", 100);
    expect(onAnalyticsEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentTime: 100, duration: 100, type: "seek" })
    );
    await controller.teardown();
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

      expect(store.set).toHaveBeenCalledTimes(boundary === "state" ? 0 : 1);
      expect(onAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: "video-1", type: "seek" })
      );
      expect(controller.getState().currentSource?.id).toBe("video-2");
      await controller.teardown();
    }
  );
});
