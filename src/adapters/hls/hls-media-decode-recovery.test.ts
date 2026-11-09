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
 * Chromium reports an MSE decode failure only on the element: it sets
 * `error` (code 3, `MEDIA_ERR_DECODE`), pauses, and fires `error`; hls.js
 * raises nothing. Recovery reloads the element, which clears the error.
 */
async function loadPlayingManagedHls() {
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const video = document.createElement("video");
  document.body.append(video);
  let paused = true;
  let error: { code: number; message: string } | null = null;
  Object.defineProperties(video, {
    error: { configurable: true, get: () => error },
    paused: { configurable: true, get: () => paused },
  });
  const play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementation(function (this: HTMLMediaElement) {
      paused = false;
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    });
  const events: VibePlayerEvent[] = [];
  const analyticsErrors = vi.fn();
  const onError = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
    onAnalyticsEvent: (event) => {
      if (event.type === "error") {
        analyticsErrors(event);
      }
    },
    onError,
    onEvent: (event) => events.push(event),
  });
  controllers.add(controller);
  await controller.mount(video);
  await controller.load({ id: "stream", type: "hls", url: "/master.m3u8" });
  const engine = getLatestHlsEngine();
  engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
  await controller.play();
  video.dispatchEvent(new Event("timeupdate"));
  engine.mediaReset = () => {
    error = null;
  };
  play.mockClear();
  events.length = 0;
  const failElement = (code: number) => {
    error = { code, message: "Element playback failed." };
    paused = true;
    video.dispatchEvent(new Event("error"));
  };
  const errorEvents = () =>
    events.flatMap((event) =>
      event.type === "error" && "payload" in event
        ? [{ code: event.payload?.code, fatal: event.payload?.fatal }]
        : []
    );
  return {
    analyticsErrors,
    controller,
    engine,
    errorEvents,
    failElement,
    onError,
    play,
  };
}

describe("managed HLS decode failures reported by the media element", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("recovers the engine, reports the failure nonfatal and resumes playback", async () => {
    const player = await loadPlayingManagedHls();

    player.failElement(3);
    expect(player.engine.recoveries).toEqual(["recoverMediaError"]);
    expect(player.errorEvents()).toEqual([{ code: 3, fatal: false }]);
    expect(player.controller.getState().error).toBeNull();
    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);

    await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce());
    expect(player.controller.getState().snapshot.paused).toBe(false);
  });

  it("fails on the third decode failure in a row, like an hls.js media error", async () => {
    const player = await loadPlayingManagedHls();

    for (const attempt of [1, 2, 3]) {
      if (attempt > 1) {
        player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
      }
      player.failElement(3);
    }

    expect(player.engine.recoveries).toEqual([
      "recoverMediaError",
      "swapAudioCodec",
      "recoverMediaError",
    ]);
    expect(player.errorEvents().map((event) => event.fatal)).toEqual([
      false,
      false,
      true,
    ]);
    expect(player.controller.getState().error).toMatchObject({
      kind: "decode",
    });
  });

  it("counts the element and hls.js reports of one append failure as one fault", async () => {
    const player = await loadPlayingManagedHls();

    player.failElement(3);
    player.engine.emit(HlsEngineProbe.Events.ERROR, {
      details: "bufferAppendError",
      error: new Error("Append failed."),
      fatal: true,
      type: "mediaError",
    });
    expect(player.engine.recoveries).toEqual(["recoverMediaError"]);
    expect(player.controller.getState().error).toBeNull();
    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
    player.failElement(3);

    // A separate fault soon after still takes the next step.
    expect(player.engine.recoveries).toEqual([
      "recoverMediaError",
      "swapAudioCodec",
      "recoverMediaError",
    ]);
    expect(player.controller.getState().error).toBeNull();
  });

  it("reports a terminal fault the element and hls.js both raise only once", async () => {
    const player = await loadPlayingManagedHls();
    for (const attempt of [1, 2]) {
      if (attempt > 1) {
        player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);
      }
      player.failElement(3);
    }
    player.engine.emit(HlsEngineProbe.Events.MEDIA_ATTACHED);

    player.failElement(3);
    player.engine.emit(HlsEngineProbe.Events.ERROR, {
      details: "bufferAppendError",
      error: new Error("Append failed."),
      fatal: true,
      type: "mediaError",
    });

    expect(player.controller.getState().error).toMatchObject({
      kind: "decode",
    });
    expect(player.onError).toHaveBeenCalledOnce();
    expect(player.analyticsErrors).toHaveBeenCalledOnce();
  });

  it("keeps an element network failure terminal", async () => {
    const player = await loadPlayingManagedHls();

    player.failElement(2);

    expect(player.engine.recoveries).toEqual([]);
    expect(player.controller.getState().error).toMatchObject({
      kind: "network",
    });
  });
});
