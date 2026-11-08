import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createControllerWithAdapter,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import { createVibePlayerMediaSession } from "./vibe-player-media-session";
import {
  installFakeMediaSession,
  uninstallFakeMediaSession,
} from "./vibe-player-media-session-test-helpers";
import type { VibePlayerMediaSession } from "./vibe-player-media-session-types";
import type { VibePlayerSource } from "./vibe-player-types";

const titledSource: VibePlayerSource = {
  ...fileSource,
  posterUrl: "https://example.com/poster.jpg",
  title: "Northern lights",
};
const participants: VibePlayerMediaSession[] = [];

async function createPlayer(source: VibePlayerSource = titledSource) {
  const adapter = new TestAdapter();
  const { controller } = createControllerWithAdapter(adapter);
  await controller.mount(document.createElement("div"));
  await controller.load(source);
  adapter.emit("playing", {
    currentTime: 30,
    paused: false,
    readyState: "playing",
  });
  const session = createVibePlayerMediaSession(controller);
  participants.push(session);
  return { adapter, controller, session };
}

afterEach(() => {
  for (const participant of participants.splice(0)) {
    participant.release();
  }
  uninstallFakeMediaSession();
  vi.useRealTimers();
});

describe("media session", () => {
  it("does nothing where the browser has no media session", async () => {
    const { session } = await createPlayer();
    expect("mediaSession" in navigator).toBe(false);
    expect(() => {
      session.claim();
      session.setOptions({ metadata: { title: "Other" } });
      session.release();
    }).not.toThrow();
  });

  it("publishes source metadata, app overrides and playback state", async () => {
    const page = installFakeMediaSession();
    const { adapter, session } = await createPlayer();
    session.claim();
    expect(page.metadata).toMatchObject({
      artwork: [{ src: "https://example.com/poster.jpg" }],
      title: "Northern lights",
    });
    expect(page.playbackState).toBe("playing");

    session.setOptions({
      metadata: {
        album: "Season two",
        artist: "Ana Berg",
        artwork: [{ sizes: "512x512", src: "/art.png", type: "image/png" }],
      },
    });
    expect(page.metadata).toMatchObject({
      album: "Season two",
      artist: "Ana Berg",
      artwork: [{ sizes: "512x512", src: "/art.png", type: "image/png" }],
      title: "Northern lights",
    });
    adapter.emit("pause", { paused: true, readyState: "ready" });
    expect(page.playbackState).toBe("paused");
  });

  it("drives the player from system controls within the media", async () => {
    const page = installFakeMediaSession();
    const { adapter, session } = await createPlayer();
    session.setOptions({ seekBackwardSeconds: 15 });
    session.claim();
    expect(page.actions).toEqual([
      "pause",
      "play",
      "seekbackward",
      "seekforward",
      "seekto",
      "stop",
    ]);

    page.trigger("seekbackward");
    await vi.waitFor(() => expect(adapter.calls).toContain("seek:15"));
    page.trigger("seekforward", { seekOffset: 5 });
    await vi.waitFor(() => expect(adapter.calls).toContain("seek:20"));
    page.trigger("seekto", { seekTime: 500 });
    await vi.waitFor(() => expect(adapter.calls).toContain("seek:100"));
    page.trigger("pause");
    await vi.waitFor(() => expect(adapter.calls).toContain("pause"));
  });

  it("offers track and picture-in-picture actions only when the app and provider can", async () => {
    const page = installFakeMediaSession();
    const { adapter, controller, session } = await createPlayer();
    const next = vi.fn();
    adapter.capabilities.canPictureInPicture = true;
    const enterPictureInPicture = vi.fn(() => Promise.resolve());
    Object.assign(adapter, { enterPictureInPicture });
    session.setOptions({ onNextTrack: next });
    session.claim();
    expect(page.handlers.has("previoustrack")).toBe(false);
    page.trigger("nexttrack");
    expect(next).toHaveBeenCalledOnce();
    page.trigger("enterpictureinpicture");
    await vi.waitFor(() =>
      expect(enterPictureInPicture).toHaveBeenCalledOnce()
    );

    session.setOptions({ pictureInPicture: false });
    adapter.emit("timeupdate", { currentTime: 31 });
    expect(page.actions).not.toContain("enterpictureinpicture");
    expect(page.actions).not.toContain("nexttrack");
    expect(controller.getState().snapshot.paused).toBe(false);
  });

  it("keeps working when the browser rejects an action", async () => {
    const page = installFakeMediaSession();
    page.unsupported.add("stop");
    const { session } = await createPlayer();
    session.claim();
    expect(page.actions).toContain("seekto");
    expect(page.actions).not.toContain("stop");
  });

  it("reports position only at discontinuities", async () => {
    vi.useFakeTimers({ now: 0 });
    const page = installFakeMediaSession();
    const { adapter, session } = await createPlayer();
    session.claim();
    expect(page.positions).toEqual([
      { duration: 100, playbackRate: 1, position: 30 },
    ]);

    vi.setSystemTime(4000);
    adapter.emit("timeupdate", { currentTime: 34 });
    expect(page.positions).toHaveLength(1);

    adapter.emit("timeupdate", { currentTime: 70 });
    adapter.emit("ratechange", { playbackRate: 2 });
    expect(page.positions.slice(1)).toEqual([
      { duration: 100, playbackRate: 1, position: 70 },
      { duration: 100, playbackRate: 2, position: 70 },
    ]);

    adapter.emit("durationchange", { duration: Number.POSITIVE_INFINITY });
    expect(page.positions.at(-1)).toBeUndefined();
  });

  it("hands the session to the next owner without either clobbering the other", async () => {
    const page = installFakeMediaSession();
    const first = await createPlayer();
    const second = await createPlayer({ ...titledSource, title: "Fjords" });
    first.session.setOptions({ onPreviousTrack: vi.fn() });
    first.session.claim();
    second.session.claim();
    expect(page.metadata?.title).toBe("Fjords");
    expect(page.handlers.has("previoustrack")).toBe(false);

    first.adapter.emit("pause", { paused: true, readyState: "ready" });
    first.session.release();
    expect(page.metadata?.title).toBe("Fjords");
    expect(page.playbackState).toBe("playing");
    expect(page.actions).toContain("play");

    second.session.release();
    expect(page.metadata).toBeNull();
    expect(page.playbackState).toBe("none");
    expect(page.actions).toEqual([]);
    expect(page.positions.at(-1)).toBeUndefined();
  });

  it("leaves metadata alone once the host has replaced it", async () => {
    const page = installFakeMediaSession();
    const { session } = await createPlayer();
    session.claim();
    const hostMetadata = new MediaMetadata({ title: "Host podcast" });
    page.metadata = hostMetadata;
    session.release();
    expect(page.metadata).toBe(hostMetadata);
    expect(page.actions).toEqual([]);
  });

  it("never claims for YouTube sources", async () => {
    const page = installFakeMediaSession();
    const { session } = await createPlayer({
      id: "yt",
      title: "Embedded",
      type: "youtube",
      youtubeVideoId: "abc123def45",
    });
    session.claim();
    expect(page.metadata).toBeNull();
    expect(page.actions).toEqual([]);
  });

  it("coalesces a fast-seek burst to its latest and final positions", async () => {
    const page = installFakeMediaSession();
    const { adapter, session } = await createPlayer();
    const seeks: ((value: undefined) => void)[] = [];
    adapter.seekTo = vi.fn(
      () => new Promise<undefined>((resolve) => seeks.push(resolve))
    );
    session.claim();
    page.trigger("seekto", { fastSeek: true, seekTime: 10 });
    page.trigger("seekto", { fastSeek: true, seekTime: 20 });
    page.trigger("seekto", { fastSeek: true, seekTime: 40 });
    await vi.waitFor(() => expect(adapter.seekTo).toHaveBeenCalledTimes(1));
    seeks[0]?.(undefined);
    await vi.waitFor(() => expect(adapter.seekTo).toHaveBeenCalledTimes(2));
    page.trigger("seekto", { seekTime: 50 });
    await vi.waitFor(() => expect(adapter.seekTo).toHaveBeenCalledTimes(3));
    expect(vi.mocked(adapter.seekTo).mock.calls.flat()).toEqual([10, 40, 50]);
  });
});
