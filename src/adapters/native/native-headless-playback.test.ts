import { afterEach, describe, expect, it, vi } from "vitest";
import { createVibePlayerAdapter } from "../create-vibe-player-adapter";
import { createHlsRuntime } from "../hls/hls-adapter-test-helpers";
import { defineNativeVideoNumberProperty } from "./native-video-test-helpers";

describe("bare video target lifecycle", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it.each(["mp4", "hls"] as const)(
    "keeps a host-owned %s element while releasing its source",
    async (type) => {
      const load = vi
        .spyOn(HTMLMediaElement.prototype, "load")
        .mockImplementation(() => undefined);
      const { runtime } = createHlsRuntime();
      const source =
        type === "mp4"
          ? { id: "host-video", type: "mp4" as const, url: "/movie.mp4" }
          : { id: "host-video", type: "hls" as const, url: "/master.m3u8" };
      const adapter = createVibePlayerAdapter(source, { hlsRuntime: runtime });
      const video = document.createElement("video");
      video.controls = true;
      video.className = "host-class";
      video.dataset.voicePlayer = "voice-focus";
      document.body.append(video);
      try {
        await adapter.mount(video);
        await adapter.load(source);
        expect(video.querySelector("video")).toBeNull();
        expect(video.controls).toBe(true);
        expect(video.classList.contains("host-class")).toBe(true);
        expect(video.dataset.voicePlayer).toBe("voice-focus");
        expect(video.preload).toBe("none");
        const loadedCount = load.mock.calls.length;
        await adapter.unmount();
        expect(video.isConnected).toBe(true);
        expect(video.getAttribute("src")).toBeNull();
        expect(load.mock.calls.length).toBeGreaterThan(loadedCount);
      } finally {
        await adapter.unmount();
      }
    }
  );

  it("reapplies resume intent after source metadata resets an early seek", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const source = { id: "resume", type: "mp4" as const, url: "/clip.mp4" };
    const loadHls = vi.fn();
    const adapter = createVibePlayerAdapter(source, { loadHls });
    const video = document.createElement("video");
    document.body.append(video);
    try {
      await adapter.mount(video);
      await adapter.load(source);
      await adapter.seekTo(23);
      video.currentTime = 0;
      defineNativeVideoNumberProperty(video, "readyState", 1);
      video.dispatchEvent(new Event("loadedmetadata"));
      expect(adapter.getSnapshot().currentTime).toBe(23);
      expect(loadHls).not.toHaveBeenCalled();
      await adapter.unmount();
      video.currentTime = 0;
      video.dispatchEvent(new Event("loadedmetadata"));
      expect(video.currentTime).toBe(0);
    } finally {
      await adapter.unmount();
    }
  });
});
