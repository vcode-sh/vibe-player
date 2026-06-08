import type {
  YouTubeAdapterRuntime,
  YouTubeIframeApi,
  YouTubePlayerHandle,
  YouTubePlayerState,
} from "./youtube-iframe-types";

let youtubeApiPromise: Promise<YouTubeIframeApi> | null = null;

export const defaultYouTubeAdapterRuntime: YouTubeAdapterRuntime = {
  async createPlayer(session) {
    const api = await loadYouTubeIframeApi();
    let player: YouTubePlayerHandle | null = null;
    player = new api.Player(session.element, {
      events: {
        onError: (event) =>
          session.onError({
            code: event.data,
            message: `YouTube player error ${event.data}`,
          }),
        onPlaybackRateChange: () => session.onPlaybackRateChange(),
        onReady: () => {
          player
            ?.getIframe?.()
            .classList.add("vibe-player-youtube-adapter-frame");
          session.onReady();
        },
        onStateChange: (event) =>
          session.onStateChange(event.data as YouTubePlayerState),
      },
      playerVars: {
        playsinline: 1,
        rel: 0,
        ...(session.startSeconds
          ? { start: Math.floor(session.startSeconds) }
          : {}),
      },
      videoId: session.videoId,
    });
    return player;
  },
};

export function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  youtubeApiPromise ??= createYouTubeIframeApiPromise();
  return youtubeApiPromise;
}

function createYouTubeIframeApiPromise(): Promise<YouTubeIframeApi> {
  return new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      const api = window.YT;
      if (api?.Player) {
        resolve(api);
        return;
      }
      reject(new Error("YouTube iframe API loaded without a Player."));
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () =>
      reject(new Error("Failed to load YouTube iframe API."));
    document.head.append(script);
  });
}
