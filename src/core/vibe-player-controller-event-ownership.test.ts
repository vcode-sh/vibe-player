import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

describe("controller event side-effect ownership", () => {
  it.each([
    { boundary: "state", effect: "progress_25", event: "timeupdate" },
    { boundary: "storage", effect: "progress_25", event: "timeupdate" },
    { boundary: "state", effect: "completed", event: "ended" },
    { boundary: "storage", effect: "completed", event: "ended" },
  ] as const)(
    "stops $event effects when a $boundary callback replaces the source",
    async ({ boundary, event, effect }) => {
      const previous = new TestAdapter();
      const current = new TestAdapter();
      let replacement: Promise<void> | undefined;
      const replace = () => {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      };
      const write = vi.fn(() => {
        if (boundary === "storage") {
          replace();
        }
      });
      const onAnalyticsEvent = vi.fn();
      const controller = new VibePlayerController({
        adapterFactory: (source) =>
          source.id === "video-1" ? previous : current,
        onAnalyticsEvent,
        resumeStore: { clear: write, get: () => null, set: write },
      });
      await controller.load(fileSource);
      controller.subscribe((state) => {
        if (boundary === "state" && state.lastEvent === event) {
          replace();
        }
      });

      previous.emit(event, {
        currentTime: event === "timeupdate" ? 30 : 100,
        readyState: event === "timeupdate" ? "playing" : "ended",
      });
      await replacement;

      expect(write).toHaveBeenCalledTimes(boundary === "state" ? 0 : 1);
      expect(onAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: "video-1", type: effect })
      );
      expect(controller.getState().currentSource?.id).toBe("video-2");
      await controller.teardown();
    }
  );

  it("does not report an error superseded by subscriber source replacement", async () => {
    const previous = new TestAdapter();
    const current = new TestAdapter();
    const onError = vi.fn();
    let replacement: Promise<void> | undefined;
    const controller = new VibePlayerController({
      adapterFactory: (source) =>
        source.id === "video-1" ? previous : current,
      onError,
    });
    await controller.load(fileSource);
    controller.subscribe((state) => {
      if (state.lastEvent === "error") {
        replacement ??= controller.load({ ...fileSource, id: "video-2" });
      }
    });

    previous.emit("error", { readyState: "error" });
    await replacement;

    expect(onError).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-2" },
      error: null,
      snapshot: { readyState: "ready" },
    });
    await controller.teardown();
  });
});
