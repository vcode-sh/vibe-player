import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import { createHlsAdapter } from "./create-hls-adapter";
import { createHlsRuntime } from "./hls-adapter-test-helpers";

const source = { id: "stream", type: "hls", url: "/stream.m3u8" } as const;

function liveWindow(start: number, end: number): TimeRanges {
  return { end: () => end, length: 1, start: () => start };
}

/** Safari plays the manifest itself; only the media element reports live. */
async function loadNativeHls(media: {
  duration: number;
  seekable?: TimeRanges;
}) {
  const writes: number[] = [];
  const video = document.createElement("video");
  document.body.append(video);
  let paused = true;
  Object.defineProperties(video, {
    duration: { configurable: true, value: media.duration },
    paused: { configurable: true, get: () => paused },
    readyState: { configurable: true, value: 4 },
    ...(media.seekable
      ? { seekable: { configurable: true, value: media.seekable } }
      : {}),
  });
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter(createHlsRuntime(false).runtime),
    resumeStore: {
      clear: () => undefined,
      get: () => null,
      set: (_sourceId, seconds) => writes.push(seconds),
    },
  });
  await controller.mount(video);
  await controller.load(source);
  video.dispatchEvent(new Event("loadedmetadata"));
  video.dispatchEvent(new Event("durationchange"));
  const playFor = (seconds: number) => {
    paused = false;
    video.dispatchEvent(new Event("playing"));
    video.currentTime += seconds;
    video.dispatchEvent(new Event("timeupdate"));
    paused = true;
    video.dispatchEvent(new Event("pause"));
  };
  return { controller, playFor, video, writes };
}

describe("native HLS live detection", () => {
  const controllers = new Set<VibePlayerController>();

  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
      "maybe"
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
  });

  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it.each([
    { duration: Number.POSITIVE_INFINITY, name: "an infinite duration" },
    {
      duration: Number.NaN,
      name: "an unknown duration with a seekable window",
      seekable: liveWindow(120, 150),
    },
  ])("treats $name as live without seeking or resume", async (media) => {
    const player = await loadNativeHls(media);
    controllers.add(player.controller);
    const { capabilities, snapshot } = player.controller.getState();

    expect(capabilities).toMatchObject({
      canSeek: false,
      isLive: true,
      supportsDuration: false,
    });
    expect(snapshot.duration).toBe(0);
    player.video.currentTime = 140;
    await player.controller.seekTo(10);
    expect(player.video.currentTime).toBe(140);
    player.playFor(4);
    expect(player.writes).toEqual([]);
  });

  it("keeps a finite native HLS duration seekable on demand", async () => {
    const player = await loadNativeHls({ duration: 24 });
    controllers.add(player.controller);

    expect(player.controller.getState().capabilities).toMatchObject({
      canSeek: true,
      isLive: false,
      supportsDuration: true,
    });
    expect(player.controller.getState().snapshot.duration).toBe(24);
  });

  it("does not call media live before its metadata arrives", async () => {
    const player = await loadNativeHls({ duration: Number.NaN });
    controllers.add(player.controller);

    expect(player.controller.getState().capabilities).toMatchObject({
      canSeek: true,
      isLive: false,
    });
  });
});
