import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerAdapterEvent } from "./vibe-player-types";

describe("controller deferred playback", () => {
  it("keeps the source idle without creating an engine until Play", async () => {
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const controller = new VibePlayerController({ adapterFactory });
    await controller.mount(document.createElement("div"));

    await controller.load({ ...fileSource, durationSeconds: 83 }, "onPlay");

    expect(adapterFactory).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-1" },
      snapshot: { duration: 83, paused: true, readyState: "idle" },
    });
    await controller.play();
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls).toContain("play");
    await controller.teardown();
  });

  it("keeps nonfatal provider diagnostics out of playback state", async () => {
    const adapter = new TestAdapter();
    let emit: (event: VibePlayerAdapterEvent) => void = () => undefined;
    adapter.subscribe = (listener) => {
      emit = listener;
      return () => undefined;
    };
    const onError = vi.fn();
    const onEvent = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
      onEvent,
    });
    await controller.load(fileSource);
    emit({
      payload: { fatal: false, message: "A fragment will be retried" },
      snapshot: { ...adapter.getSnapshot(), readyState: "error" },
      type: "error",
    });

    expect(controller.getState().error).toBeNull();
    expect(controller.getState().snapshot.readyState).toBe("ready");
    expect(onError).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { fatal: false, message: "A fragment will be retried" },
        source: fileSource,
        type: "error",
      })
    );
    await controller.teardown();
  });

  it("stops and releases an active engine, retaining the position for a later Play", async () => {
    const adapters: TestAdapter[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => {
        const adapter = new TestAdapter();
        adapters.push(adapter);
        return adapter;
      },
    });
    await controller.load(fileSource, "onPlay");
    await controller.setMuted(true);
    await controller.play();
    const [first] = adapters;
    if (!first) {
      throw new Error("Missing first adapter");
    }
    first.emit("timeupdate", {
      currentTime: 43,
      paused: false,
      readyState: "playing",
    });

    await controller.stop();
    expect(first.calls).toContain("unmount");
    expect(controller.getState()).toMatchObject({
      currentSource: fileSource,
      snapshot: { currentTime: 43, paused: true, readyState: "idle" },
    });
    expect(adapters).toHaveLength(1);

    await controller.play();
    expect(adapters).toHaveLength(2);
    expect(adapters[1]?.calls).toContain("seek:43");
    expect(adapters[1]?.calls).toContain("muted:true");
    expect(adapters[1]?.calls).toContain("play");
    await controller.teardown();
  });

  it.each([false, true])(
    "starts Replay from zero after the source ends (stop: %s)",
    async (stop) => {
      const adapter = new TestAdapter();
      const controller = new VibePlayerController({
        adapterFactory: () => adapter,
      });
      await controller.load(fileSource);
      adapter.emit("ended", {
        currentTime: 100,
        paused: true,
        readyState: "ended",
      });
      if (stop) {
        await controller.stop();
      }
      await controller.play();
      expect(adapter.calls).toContain("seek:0");
      expect(controller.getState().snapshot).toMatchObject({
        currentTime: 0,
        paused: false,
        readyState: "buffering",
      });
      await controller.teardown();
    }
  );
});
