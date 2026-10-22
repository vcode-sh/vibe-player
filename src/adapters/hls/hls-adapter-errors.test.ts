import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defineNativeVideoBooleanProperty,
  defineNativeVideoNumberProperty,
  getMountedNativeVideo,
} from "../native/native-video-test-helpers";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  createHlsRuntime,
  getManagedSession,
  hlsSource,
} from "./hls-adapter-test-helpers";

describe("HLS media failure translation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps recoverable playback and persists terminal failure until another load", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { runtime, probe } = createHlsRuntime();
    const adapter = createHlsAdapter(runtime);
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
});
