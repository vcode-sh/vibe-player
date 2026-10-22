import { describe, expect, it } from "vitest";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  createYouTubeRuntime,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { youtubePlayerStates } from "./youtube-iframe-types";

describe("YouTube iframe mount ownership", () => {
  it("retains the SDK-replaced iframe when mounting the same target again", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    try {
      await adapter.mount(target);
      await adapter.load(youtubeSource);
      probe.currentTime = 43;
      getYouTubeSession(probe).onStateChange(youtubePlayerStates.playing);
      await adapter.mount(target);

      expect(target.querySelectorAll("iframe")).toHaveLength(1);
      expect(target.querySelector("iframe")).toBe(probe.iframe);
      expect(probe.iframe.parentElement).toBe(target);
      expect(adapter.getSnapshot()).toMatchObject({
        currentTime: 43,
        paused: false,
      });
      expect(probe.destroyed).toBe(false);
    } finally {
      await adapter.unmount();
      target.remove();
    }
  });

  it("moves the current iframe to a new target without recreating playback", async () => {
    const { probe, runtime } = createYouTubeRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const previous = document.createElement("div");
    const current = document.createElement("section");
    try {
      await adapter.mount(previous);
      await adapter.load(youtubeSource);
      await adapter.seekTo(27);
      await adapter.mount(current);

      expect(previous.childElementCount).toBe(0);
      expect(current.querySelector("iframe")).toBe(probe.iframe);
      expect(probe.iframe.parentElement).toBe(current);
      expect(adapter.getSnapshot().currentTime).toBe(27);
      expect(probe.destroyed).toBe(false);
    } finally {
      await adapter.unmount();
      previous.remove();
      current.remove();
    }
  });
});
