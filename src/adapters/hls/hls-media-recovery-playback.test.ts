import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type { VibePlayerEvent } from "../../core/vibe-player-host-events";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  getLatestHlsEngine,
  HlsEngineProbe,
  loadProbeHls,
} from "./hls-engine-test-helpers";

const controllers = new Set<VibePlayerController>();

/**
 * hls.js recovers a media error by detaching and reattaching the media: the
 * element's `src` is removed and reloaded, which pauses it without a `pause`
 * event. The fake element models exactly that.
 */
async function loadPlayingManagedHls() {
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const video = document.createElement("video");
  document.body.append(video);
  let paused = true;
  Object.defineProperty(video, "paused", {
    configurable: true,
    get: () => paused,
  });
  const play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementation(function (this: HTMLMediaElement) {
      paused = false;
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement
  ) {
    paused = true;
    this.dispatchEvent(new Event("pause"));
  });
  const events: VibePlayerEvent[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
    onEvent: (event) => events.push(event),
  });
  controllers.add(controller);
  await controller.mount(video);
  await controller.load({ id: "stream", type: "hls", url: "/master.m3u8" });
  const engine = getLatestHlsEngine();
  engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
  await controller.play();
  engine.mediaReset = () => {
    paused = true;
    video.dispatchEvent(new Event("emptied"));
  };
  play.mockClear();
  events.length = 0;
  const failMedia = () =>
    engine.emit(HlsEngineProbe.Events.ERROR, {
      details: "bufferAppendError",
      error: new Error("Decoding failed."),
      fatal: true,
      type: "mediaError",
    });
  return { controller, engine, events, failMedia, play, video };
}

describe("playback across hls.js media recovery", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resumes media that was playing once hls.js reattached it", async () => {
    const player = await loadPlayingManagedHls();
    player.failMedia();
    expect(player.play).not.toHaveBeenCalled();

    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
    await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce());

    expect(player.video.paused).toBe(false);
    expect(player.controller.getState().snapshot.paused).toBe(false);
    expect(player.events.map((event) => event.type)).not.toContain("pause");
    // The reattach resumes the loaded source rather than loading it again.
    expect(player.engine.loadedUrls).toHaveLength(1);
  });

  it("reports a blocked resume instead of stopping silently", async () => {
    const player = await loadPlayingManagedHls();
    player.failMedia();
    player.play.mockRejectedValueOnce(
      new DOMException("Playback needs a gesture.", "NotAllowedError")
    );

    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);

    await vi.waitFor(() =>
      expect(player.controller.getState().playbackBlocked).toBe(true)
    );
    expect(player.events.map((event) => event.type)).toContain("playblocked");
    expect(player.controller.getState().error).toBeNull();
  });

  it("does not resume media whose recovery ended in a terminal error", async () => {
    const player = await loadPlayingManagedHls();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(50_000);
    for (const _attempt of [1, 2, 3]) {
      // Distinct faults while the reattach is still pending.
      player.failMedia();
      vi.advanceTimersByTime(1500);
    }
    expect(player.controller.getState().error).toMatchObject({
      kind: "decode",
    });

    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
  });

  it("does not resume media after another fatal error failed the session", async () => {
    const player = await loadPlayingManagedHls();
    player.failMedia();
    player.engine.emit(HlsEngineProbe.Events.ERROR, {
      details: "fragLoadError",
      error: new Error("Segment unavailable."),
      fatal: true,
      type: "networkError",
    });

    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
  });

  it("keeps a pause the viewer made while the media was being recovered", async () => {
    const player = await loadPlayingManagedHls();
    player.failMedia();
    await player.controller.pause();

    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
    expect(player.video.paused).toBe(true);
  });

  it("leaves paused media paused after recovery", async () => {
    const player = await loadPlayingManagedHls();
    await player.controller.pause();
    player.failMedia();

    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
  });
});
