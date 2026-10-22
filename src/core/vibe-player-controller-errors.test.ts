import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import {
  createBlockedPlaybackError,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import type { VibePlayerAdapterEvent } from "./vibe-player-types";

class EventAdapter extends TestAdapter {
  emitProviderEvent: (event: VibePlayerAdapterEvent) => void = () => undefined;

  override subscribe(listener: (event: VibePlayerAdapterEvent) => void) {
    this.emitProviderEvent = listener;
    return super.subscribe(listener);
  }
}

describe("controller playback diagnostics", () => {
  it("reports factory failures with the requested source and original cause", async () => {
    const cause = new Error("Provider unavailable");
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => {
        throw cause;
      },
      onError,
    });

    await expect(controller.load(fileSource)).rejects.toBe(cause);

    expect(controller.getState()).toMatchObject({
      currentSource: fileSource,
      error: {
        cause,
        message: "Provider unavailable",
        phase: "create",
        provider: "file",
        sourceId: "video-1",
      },
      lastEvent: "error",
      snapshot: { readyState: "error" },
    });
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      controller.getState().error
    );
    await controller.teardown();
  });

  it("reports a mount rejection before loading the source", async () => {
    const adapter = new TestAdapter();
    const cause = new Error("Media target detached");
    const onError = vi.fn();
    adapter.mount = () => Promise.reject(cause);
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await controller.mount(document.createElement("div"));

    await expect(controller.load(fileSource)).rejects.toBe(cause);

    expect(controller.getState().error).toMatchObject({
      cause,
      message: "Media target detached",
      phase: "mount",
      sourceId: "video-1",
    });
    expect(controller.getState().snapshot.readyState).toBe("error");
    expect(adapter.calls).not.toContain("load:video-1");
    expect(onError).toHaveBeenCalledTimes(1);
    await controller.teardown();
  });

  it("preserves provider details and ignores a disposed provider callback", async () => {
    const old = new EventAdapter();
    const current = new EventAdapter();
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: (source) => (source.id === "video-1" ? old : current),
      onError,
    });
    await controller.load(fileSource);
    old.emitProviderEvent({
      payload: {
        details: "manifestLoadError",
        fatal: true,
        message: "Manifest denied",
        type: "networkError",
      },
      snapshot: { ...old.getSnapshot(), readyState: "error" },
      type: "error",
    });

    expect(controller.getState().error).toMatchObject({
      details: {
        details: "manifestLoadError",
        fatal: true,
        message: "Manifest denied",
        type: "networkError",
      },
      message: "Manifest denied",
      phase: "playback",
      sourceId: "video-1",
    });
    await controller.load({ ...fileSource, id: "video-2" });
    old.emitProviderEvent({
      payload: { message: "Obsolete provider error" },
      snapshot: { ...old.getSnapshot(), currentTime: 88, readyState: "error" },
      type: "error",
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-2" },
      error: null,
      lastEvent: "ready",
      snapshot: { currentTime: 0, readyState: "ready" },
    });
    await controller.teardown();
  });

  it("reports mounting an already loaded source and clears diagnostics on retry", async () => {
    const adapter = new TestAdapter();
    const cause = new Error("Cannot attach media");
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await controller.load(fileSource);
    adapter.mount = () => Promise.reject(cause);

    await expect(
      controller.mount(document.createElement("section"))
    ).rejects.toBe(cause);

    expect(controller.getState().error).toMatchObject({
      cause,
      phase: "mount",
      sourceId: "video-1",
    });
    expect(onError).toHaveBeenCalledTimes(1);
    adapter.mount = () => Promise.resolve();
    await controller.load({ ...fileSource, id: "video-2" });
    expect(controller.getState().error).toBeNull();
    await controller.teardown();
  });

  it("reports a provider event followed by load rejection only once", async () => {
    const adapter = new EventAdapter();
    const cause = new Error("Manifest unavailable");
    adapter.load = () => {
      adapter.emitProviderEvent({
        payload: {
          details: "manifestLoadError",
          message: "Manifest unavailable",
        },
        snapshot: { ...adapter.getSnapshot(), readyState: "error" },
        type: "error",
      });
      return Promise.reject(cause);
    };
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });

    await expect(controller.load(fileSource)).rejects.toBe(cause);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.getState().error).toMatchObject({
      details: { details: "manifestLoadError" },
      message: "Manifest unavailable",
      sourceId: "video-1",
    });
    await controller.teardown();
  });

  it("keeps browser playback rejection as a notice without reporting failure", async () => {
    const adapter = new TestAdapter();
    adapter.playError = createBlockedPlaybackError();
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await controller.load(fileSource);

    await controller.play();

    expect(controller.getState()).toMatchObject({
      error: null,
      playbackBlocked: true,
    });
    expect(onError).not.toHaveBeenCalled();
    await controller.teardown();
  });

  it("preserves the original failure and state notifications when onError throws", async () => {
    const cause = new Error("Provider unavailable");
    const onError = vi.fn(() => {
      throw new Error("Host observer failed");
    });
    const controller = new VibePlayerController({
      adapterFactory: () => {
        throw cause;
      },
      onError,
    });
    const observedErrors: unknown[] = [];
    controller.subscribe((state) => observedErrors.push(state.error));

    await expect(controller.load(fileSource)).rejects.toBe(cause);

    expect(observedErrors.at(-1)).toMatchObject({
      cause,
      message: "Provider unavailable",
    });
    expect(onError).toHaveBeenCalledTimes(1);
    await controller.teardown();
  });
});
