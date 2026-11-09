import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type { VibePlayerEvent } from "../../core/vibe-player-host-events";
import type {
  VibePlayerAnalyticsEvent,
  VibePlayerSource,
} from "../../core/vibe-player-types";
import { getMountedNativeVideo } from "../native/native-video-test-helpers";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  getLatestHlsEngine,
  HlsEngineProbe,
  loadProbeHls,
} from "./hls-engine-test-helpers";

const controllers = new Set<VibePlayerController>();
const source: VibePlayerSource = {
  id: "stream",
  type: "hls",
  url: "/stream/master.m3u8",
};

async function loadManagedHls() {
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const seekEvents: VibePlayerEvent[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
    onEvent: (event) => {
      if (event.type === "seeking" || event.type === "seeked") {
        seekEvents.push(event);
      }
    },
  });
  controllers.add(controller);
  const target = document.createElement("div");
  await controller.mount(target);
  await controller.load(source);
  const video = getMountedNativeVideo(target);
  /** The media seeks to `time` and reports it, as the element does. */
  const seekMedia = (time: number) => {
    video.currentTime = time;
    video.dispatchEvent(new Event("seeking"));
    video.dispatchEvent(new Event("seeked"));
  };
  const marks = () =>
    seekEvents.map((event) =>
      "payload" in event ? event.payload?.internal : undefined
    );
  const seeks = () => analytics.filter((event) => event.type === "seek");
  return {
    controller,
    engine: getLatestHlsEngine(),
    marks,
    seekMedia,
    seeks,
    video,
  };
}

describe("seeks hls.js makes itself", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(["bufferNudgeOnStall", "bufferSeekOverHole"])(
    "marks the seek after a %s diagnostic internal and reports no seek",
    async (details) => {
      const player = await loadManagedHls();
      player.video.currentTime = 10;
      // hls.js moves the playhead, then raises the nonfatal diagnostic.
      player.video.currentTime = 10.1;
      player.engine.emit(HlsEngineProbe.Events.ERROR, {
        details,
        error: new Error("Moved the playhead"),
        fatal: false,
        type: "mediaError",
      });
      player.seekMedia(10.1);

      expect(player.marks()).toEqual([true, true]);
      expect(player.seeks()).toEqual([]);
    }
  );

  it("marks a live-edge catch-up internal", async () => {
    const player = await loadManagedHls();
    player.engine.liveSyncPosition = 120;
    player.seekMedia(120.2);

    expect(player.marks()).toEqual([true, true]);
    expect(player.seeks()).toEqual([]);
  });

  it("marks the start-position seek before playback internal", async () => {
    const player = await loadManagedHls();
    player.engine.startPosition = 0.4;
    player.seekMedia(0.4);

    expect(player.marks()).toEqual([true, true]);
  });

  it("leaves a seek the viewer makes elsewhere a media seek", async () => {
    const player = await loadManagedHls();
    player.engine.liveSyncPosition = 120;
    player.seekMedia(30);

    expect(player.marks()).toEqual([undefined, undefined]);
    expect(player.seeks()).toEqual([
      expect.objectContaining({ currentTime: 30, initiator: "media" }),
    ]);
  });

  it("never marks the adapter's own seek, even at the start position", async () => {
    const player = await loadManagedHls();
    player.engine.startPosition = 30;
    await player.controller.seekTo(30);
    player.video.dispatchEvent(new Event("seeking"));
    player.video.dispatchEvent(new Event("seeked"));

    expect(player.marks()).toEqual([undefined, undefined]);
  });
});
