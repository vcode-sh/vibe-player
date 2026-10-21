import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapterEvent } from "../core/vibe-player-types";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  createDeferredManagedHlsController,
  createDeferredManagedHlsFailure,
  createHlsRuntime,
  getManagedSession,
  hlsSource,
} from "./hls-adapter-test-helpers";
import { getMountedNativeVideo } from "./native-video-test-helpers";

describe("createHlsAdapter load sessions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("destroys managed HLS when async load resolves after unmount", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const controller = createDeferredManagedHlsController();
    const destroySpy = vi.fn(() => undefined);
    const events: VibePlayerAdapterEvent[] = [];
    const { probe, runtime } = createHlsRuntime();
    runtime.attachManagedHls = (pendingSession) => {
      probe.session = pendingSession;
      return controller.promise;
    };
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    const loadPromise = adapter.load(hlsSource);
    const session = getManagedSession(probe);
    await adapter.unmount();
    const eventCountAfterUnmount = events.length;
    session.onReady();
    session.onLevelLoaded(true);
    session.onLevelsChanged([{ bitrate: 1_500_000, height: 720 }], 0);
    session.onError({
      details: "manifestLoadError",
      fatal: true,
      message: "stale",
      type: "networkError",
    });
    controller.resolve({
      destroy: destroySpy,
      setQualityLevel: () => undefined,
    });
    await loadPromise;

    expect(events).toHaveLength(eventCountAfterUnmount);
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(adapter.getSnapshot().readyState).toBe("idle");
    expect(adapter.capabilities.canSeek).toBe(false);
    expect(adapter.getSnapshot().qualityOptions ?? []).toEqual([]);
  });

  it("does not apply stale native fallback after a newer HLS load", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
      "probably"
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const firstAttach = createDeferredManagedHlsFailure();
    const firstSource = hlsSource;
    const secondSource = {
      ...hlsSource,
      id: "hls-video-next",
      manifestUrl: "https://example.com/next-stream.m3u8",
    };
    const { runtime } = createHlsRuntime();
    runtime.attachManagedHls = (session) => {
      if (session.manifestUrl === firstSource.manifestUrl) {
        return firstAttach.promise;
      }
      return {
        destroy: () => undefined,
        setQualityLevel: () => undefined,
      };
    };
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");

    await adapter.mount(target);
    const firstLoad = adapter.load(firstSource);
    await adapter.load(secondSource);
    firstAttach.reject(new Error("old managed HLS failed"));
    await firstLoad;

    expect(getMountedNativeVideo(target).getAttribute("src")).toBeNull();
    expect(adapter.getSnapshot().readyState).toBe("loading");
  });
});
