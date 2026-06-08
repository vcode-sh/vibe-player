import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapterEvent,
  VibePlayerFileSource,
  VibePlayerYouTubeSource,
} from "../core/vibe-player-types";
import { createVibePlayerAdapter } from "./create-vibe-player-adapter";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import type {
  YouTubeAdapterRuntime,
  YouTubePlayerHandle,
  YouTubePlayerSession,
} from "./youtube-iframe-types";
import { youtubePlayerStates } from "./youtube-iframe-types";

const youtubeSource: VibePlayerYouTubeSource = {
  id: "youtube-video",
  startSeconds: 12,
  title: "YouTube video",
  type: "youtube",
  youtubeVideoId: "dQw4w9WgXcQ",
};

interface RuntimeProbe {
  actions: string[];
  currentTime: number;
  destroyed: boolean;
  duration: number;
  iframe: HTMLIFrameElement;
  loadedFraction: number;
  muted: boolean;
  playbackRate: number;
  session: YouTubePlayerSession | null;
  volume: number;
}

function createRuntime(): {
  handle: YouTubePlayerHandle;
  probe: RuntimeProbe;
  runtime: YouTubeAdapterRuntime;
} {
  const iframe = document.createElement("iframe");
  iframe.requestFullscreen = () => Promise.resolve();
  const probe: RuntimeProbe = {
    actions: [],
    currentTime: 0,
    destroyed: false,
    duration: 180,
    iframe,
    loadedFraction: 0.5,
    muted: false,
    playbackRate: 1,
    session: null,
    volume: 75,
  };
  const handle: YouTubePlayerHandle = {
    destroy: () => {
      probe.destroyed = true;
    },
    getCurrentTime: () => probe.currentTime,
    getDuration: () => probe.duration,
    getIframe: () => probe.iframe,
    getPlaybackRate: () => probe.playbackRate,
    getVideoLoadedFraction: () => probe.loadedFraction,
    getVolume: () => probe.volume,
    isMuted: () => probe.muted,
    mute: () => {
      probe.muted = true;
      probe.actions.push("mute");
    },
    pauseVideo: () => {
      probe.actions.push("pause");
    },
    playVideo: () => {
      probe.actions.push("play");
    },
    seekTo: (seconds) => {
      probe.currentTime = seconds;
      probe.actions.push(`seek:${seconds}`);
    },
    setPlaybackRate: (value) => {
      probe.playbackRate = value;
      probe.actions.push(`rate:${value}`);
    },
    setVolume: (value) => {
      probe.volume = value;
      probe.actions.push(`volume:${value}`);
    },
    unMute: () => {
      probe.muted = false;
      probe.actions.push("unmute");
    },
  };
  return {
    handle,
    probe,
    runtime: {
      createPlayer(session) {
        probe.session = session;
        session.element.replaceWith(probe.iframe);
        return handle;
      },
    },
  };
}

function getSession(probe: RuntimeProbe): YouTubePlayerSession {
  if (!probe.session) {
    throw new Error("Expected YouTube session.");
  }
  return probe.session;
}

describe("createYouTubeAdapter", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads YouTube videos through an iframe runtime bridge", async () => {
    const { probe, runtime } = createRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    getSession(probe).onReady();

    expect(getSession(probe).videoId).toBe(youtubeSource.youtubeVideoId);
    expect(getSession(probe).startSeconds).toBe(12);
    expect(target.querySelector("iframe")).toBe(probe.iframe);
    expect(adapter.kind).toBe("youtube");
    expect(adapter.capabilities.canShowCaptions).toBe(false);
    expect(adapter.capabilities.hasNativeCaptionsMenu).toBe(true);
    expect(adapter.capabilities.canFullscreen).toBe(true);
    expect(events.at(-1)?.type).toBe("ready");
  });

  it("normalizes state changes and sampled time updates", async () => {
    vi.useFakeTimers();
    const { probe, runtime } = createRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(target);
    await adapter.load(youtubeSource);
    probe.currentTime = 25;
    getSession(probe).onStateChange(youtubePlayerStates.playing);
    vi.advanceTimersByTime(500);

    expect(events.map((event) => event.type)).toContain("play");
    expect(events.at(-1)?.type).toBe("timeupdate");
    expect(events.at(-1)?.snapshot).toMatchObject({
      bufferedPct: 50,
      currentTime: 25,
      duration: 180,
      paused: false,
      readyState: "playing",
      volume: 0.75,
    });

    getSession(probe).onStateChange(youtubePlayerStates.paused);
    expect(events.at(-1)?.type).toBe("pause");
    getSession(probe).onStateChange(youtubePlayerStates.ended);
    expect(events.at(-1)?.type).toBe("ended");
  });

  it("forwards commands and clamps seek and volume values", async () => {
    const { probe, runtime } = createRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(youtubeSource);

    await adapter.play();
    await adapter.pause();
    await adapter.seekTo(250);
    await adapter.setMuted(true);
    await adapter.setMuted(false);
    await adapter.setPlaybackRate(1.5);
    await adapter.setVolume(2);
    await adapter.enterFullscreen?.();
    await adapter.unmount();

    expect(probe.actions).toEqual([
      "play",
      "pause",
      "seek:180",
      "mute",
      "unmute",
      "rate:1.5",
      "volume:100",
    ]);
    expect(probe.destroyed).toBe(true);
  });

  it("rejects unsupported sources", async () => {
    const { runtime } = createRuntime();
    const adapter = createYouTubeAdapter(runtime);
    const fileSource: VibePlayerFileSource = {
      id: "file",
      sources: [{ mimeType: "video/mp4", url: "https://example.com/file.mp4" }],
      type: "file",
    };

    await expect(adapter.load(fileSource)).rejects.toThrow(
      "YouTube adapter cannot load file sources."
    );
  });

  it("is selected by the default adapter factory", () => {
    expect(createVibePlayerAdapter(youtubeSource).kind).toBe("youtube");
  });
});
