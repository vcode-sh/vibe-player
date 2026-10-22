import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerYouTubeSource,
} from "../../core/vibe-player-types";
import type {
  YouTubeAdapterRuntime,
  YouTubePlayerHandle,
  YouTubePlayerSession,
} from "./youtube-iframe-types";

export const youtubeSource: VibePlayerYouTubeSource = {
  id: "youtube-video",
  startSeconds: 12,
  title: "YouTube video",
  type: "youtube",
  youtubeVideoId: "dQw4w9WgXcQ",
};

export interface YouTubeRuntimeProbe {
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

export function collectYouTubeAdapterEvents(
  adapter: VibePlayerAdapter
): VibePlayerAdapterEvent[] {
  const events: VibePlayerAdapterEvent[] = [];
  adapter.subscribe((event) => {
    events.push(event);
  });
  return events;
}

export function createStalledYouTubeRuntime(): YouTubeAdapterRuntime {
  return {
    createPlayer: () => new Promise<YouTubePlayerHandle>(() => undefined),
  };
}

export function createYouTubeRuntime(): {
  probe: YouTubeRuntimeProbe;
  runtime: YouTubeAdapterRuntime;
} {
  const iframe = document.createElement("iframe");
  iframe.requestFullscreen = () => Promise.resolve();
  const probe = createYouTubeRuntimeProbe(iframe);
  const handle = createYouTubePlayerHandle(probe);
  return {
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

export function getYouTubeSession(
  probe: YouTubeRuntimeProbe
): YouTubePlayerSession {
  if (!probe.session) {
    throw new Error("Expected YouTube session.");
  }
  return probe.session;
}

function createYouTubeRuntimeProbe(
  iframe: HTMLIFrameElement
): YouTubeRuntimeProbe {
  return {
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
}

function createYouTubePlayerHandle(
  probe: YouTubeRuntimeProbe
): YouTubePlayerHandle {
  return {
    destroy: () => {
      probe.destroyed = true;
      probe.iframe.remove();
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
}
