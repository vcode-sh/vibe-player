import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerSource,
} from "../../core/vibe-player-types";
import { createFileAdapter } from "../file";
import { createHlsAdapter } from "../hls";
import {
  createDeferredPlayback,
  defineNativeVideoBooleanProperty,
  getMountedNativeVideo,
} from "./native-video-test-helpers";

interface NativeAdapterCase {
  adapter: VibePlayerAdapter;
  source: VibePlayerSource;
}

function createAdapterCase(kind: "file" | "hls"): NativeAdapterCase {
  if (kind === "file") {
    return {
      adapter: createFileAdapter(),
      source: {
        id: "first-file",
        sources: [{ mimeType: "video/mp4", url: "/first.mp4" }],
        type: "file",
      },
    };
  }
  return {
    adapter: createHlsAdapter({
      attachManagedHls() {
        throw new Error("Native HLS must not attach a managed runtime.");
      },
      canUseManagedHls: () => false,
    }),
    source: { id: "first-hls", manifestUrl: "/first.m3u8", type: "hls" },
  };
}

describe("native adapter mount sessions", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it.each(["file", "hls"] as const)(
    "preserves a newer %s play request when an earlier play settles",
    async (kind) => {
      vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
        "probably"
      );
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
        () => undefined
      );
      const { adapter, source } = createAdapterCase(kind);
      const target = document.createElement("div");
      document.body.append(target);
      const earlier = createDeferredPlayback();
      let pending: Promise<void> | undefined;
      try {
        await adapter.mount(target);
        await adapter.load(source);
        const video = getMountedNativeVideo(target);
        video.play = vi
          .fn(async () => {
            defineNativeVideoBooleanProperty(video, "paused", false);
          })
          .mockImplementationOnce(async () => {
            await earlier.promise;
            defineNativeVideoBooleanProperty(video, "paused", false);
          });
        video.pause = () =>
          defineNativeVideoBooleanProperty(video, "paused", true);

        pending = adapter.play();
        await adapter.pause();
        await adapter.play();
        expect(video.paused).toBe(false);
        earlier.resolve();
        await pending;

        expect(video.paused).toBe(false);
      } finally {
        earlier.resolve();
        await pending;
        await adapter.unmount();
      }
    }
  );

  it.each(["file", "hls"] as const)(
    "ignores former %s media events after unmount and replacement",
    async (kind) => {
      vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
        "probably"
      );
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
        () => undefined
      );
      const { adapter, source } = createAdapterCase(kind);
      const target = document.createElement("div");
      const events: VibePlayerAdapterEvent[] = [];
      const unsubscribe = adapter.subscribe((event) => events.push(event));
      try {
        await adapter.mount(target);
        await adapter.load(source);
        const formerVideo = getMountedNativeVideo(target);
        await adapter.unmount();
        events.length = 0;

        formerVideo.dispatchEvent(new Event("timeupdate"));
        formerVideo.dispatchEvent(new Event("play"));
        expect(events).toEqual([]);

        await adapter.mount(target);
        await adapter.load({ ...source, id: "replacement" });
        const currentVideo = getMountedNativeVideo(target);
        events.length = 0;
        formerVideo.dispatchEvent(new Event("error"));
        expect(events).toEqual([]);
        currentVideo.currentTime = 17;
        currentVideo.dispatchEvent(new Event("timeupdate"));
        expect(
          events.map((event) => [event.type, event.snapshot.currentTime])
        ).toEqual([["timeupdate", 17]]);
      } finally {
        unsubscribe();
        await adapter.unmount();
      }
    }
  );
});
