import type {
  YouTubeAdapterRuntime,
  YouTubePlayerHandle,
  YouTubePlayerSession,
} from "vibe-player";

interface YouTubeLayoutSession {
  captionLanguage: YouTubePlayerSession["captionLanguage"] | undefined;
  controls: YouTubePlayerSession["controls"] | undefined;
  showCaptionsByDefault:
    | YouTubePlayerSession["showCaptionsByDefault"]
    | undefined;
}

export interface YouTubeLayoutProbe {
  sessions: YouTubeLayoutSession[];
}

declare global {
  interface Window {
    youtubeLayout: YouTubeLayoutProbe;
  }
}

const frameDocument = `<!doctype html><style>
html,body{margin:0;height:100%;background:#2b5cff;color:#fff;font:600 20px system-ui}
body{display:grid;place-items:center}button{font:inherit}
</style><button type="button">Provider frame control</button>`;

/** Deterministic SDK-boundary double: a real iframe with no network. */
export function createLayoutRuntime(): YouTubeAdapterRuntime {
  window.youtubeLayout = { sessions: [] };
  return {
    createPlayer(session) {
      window.youtubeLayout.sessions.push({
        captionLanguage: session.captionLanguage,
        controls: session.controls,
        showCaptionsByDefault: session.showCaptionsByDefault,
      });
      const iframe = document.createElement("iframe");
      iframe.className = "vibe-player-youtube-adapter-frame";
      iframe.srcdoc = frameDocument;
      iframe.title = "Provider frame";
      session.element.replaceWith(iframe);
      queueMicrotask(() => session.onStateChange(5));
      return createHandle(iframe);
    },
  };
}

function createHandle(iframe: HTMLIFrameElement): YouTubePlayerHandle {
  let time = 0;
  let muted = false;
  let volume = 100;
  let rate = 1;
  return {
    destroy: () => iframe.remove(),
    getAvailablePlaybackRates: () => [0.5, 1, 1.5, 2],
    getCurrentTime: () => time,
    getDuration: () => 24,
    getIframe: () => iframe,
    getPlaybackRate: () => rate,
    getVolume: () => volume,
    isMuted: () => muted,
    mute: () => {
      muted = true;
    },
    pauseVideo: () => undefined,
    playVideo: () => undefined,
    seekTo: (seconds) => {
      time = seconds;
    },
    setPlaybackRate: (value) => {
      rate = value;
    },
    setVolume: (value) => {
      volume = value;
    },
    unMute: () => {
      muted = false;
    },
  };
}
