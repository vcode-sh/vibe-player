import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defineNativeVideoBooleanProperty,
  defineNativeVideoNumberProperty,
  getMountedNativeVideo,
} from "../native/native-video-test-helpers";
import { createAdapterTestScope } from "../shared/adapter-test-helpers";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  createHlsRuntime,
  getManagedSession,
  hlsSource,
} from "./hls-adapter-test-helpers";

const adapterScope = createAdapterTestScope();

describe("HLS media failure translation", () => {
  afterEach(async () => {
    await adapterScope.cleanup();
    vi.restoreAllMocks();
  });

  it("keeps recoverable playback and persists terminal failure until another load", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { runtime, probe } = createHlsRuntime();
    const adapter = adapterScope.track(createHlsAdapter(runtime));
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(hlsSource);
    const video = getMountedNativeVideo(target);
    defineNativeVideoBooleanProperty(video, "paused", false);
    defineNativeVideoNumberProperty(video, "readyState", 4);
    const session = getManagedSession(probe);
    const failure = {
      details: "fragLoadError",
      message: "Segment download failed",
      type: "networkError",
    };

    session.onError({ ...failure, fatal: false });
    expect(adapter.getSnapshot().readyState).toBe("playing");
    session.onError({ ...failure, fatal: true });
    expect(adapter.getSnapshot().readyState).toBe("error");
    session.onReady();
    video.dispatchEvent(new Event("timeupdate"));
    expect(adapter.getSnapshot().readyState).toBe("error");

    await adapter.load({ ...hlsSource, id: "replacement" });
    expect(adapter.getSnapshot().readyState).toBe("playing");
    await adapter.unmount();
    expect(adapter.getSnapshot().readyState).toBe("idle");
  });

  it.each([true, false])(
    "identifies actual native HLS error paths: %s",
    async (nativeHls) => {
      vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
        "probably"
      );
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
        () => undefined
      );
      const { runtime } = createHlsRuntime(!nativeHls);
      const adapter = adapterScope.track(createHlsAdapter(runtime));
      const target = document.createElement("div");
      const events: unknown[] = [];
      adapter.subscribe((event) => events.push(event));
      await adapter.mount(target);
      await adapter.load(hlsSource);
      const video = getMountedNativeVideo(target);
      Object.defineProperty(video, "error", {
        configurable: true,
        value: { code: 4, message: "Received 403 HTTP error code" },
      });
      video.dispatchEvent(new Event("error"));
      expect(events.at(-1)).toMatchObject({
        payload: { code: 4, fatal: true, nativeHls, network: false },
        type: "error",
      });
    }
  );
});
