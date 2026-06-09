import type {
  YouTubeAdapterRuntime,
  YouTubeIframeApi,
  YouTubePlayerHandle,
  YouTubePlayerState,
} from "./youtube-iframe-types";

let youtubeApiPromise: Promise<YouTubeIframeApi> | null = null;

const youtubeIframeApiSrc = "https://www.youtube.com/iframe_api";
const youtubeIframeApiTimeoutMs = 8000;
const youtubeIframeApiPollMs = 50;

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
        origin: getYouTubePlayerOrigin(session.origin),
        playsinline: 1,
        rel: 0,
        ...(session.startSeconds
          ? { start: Math.floor(session.startSeconds) }
          : {}),
        ...(session.widgetReferrer
          ? { widget_referrer: session.widgetReferrer }
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
    let completed = false;
    let script: HTMLScriptElement | null = document.querySelector(
      `script[src="${youtubeIframeApiSrc}"]`
    );
    const pollId = window.setInterval(
      () => resolveIfReady(),
      youtubeIframeApiPollMs
    );
    const timeoutId = window.setTimeout(
      () => rejectOnce(new Error("Timed out loading YouTube iframe API.")),
      youtubeIframeApiTimeoutMs
    );

    function cleanup(): void {
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
      script?.removeEventListener("error", handleScriptError);
      if (window.onYouTubeIframeAPIReady === handleReady) {
        if (previousReady) {
          window.onYouTubeIframeAPIReady = previousReady;
        } else {
          window.onYouTubeIframeAPIReady = undefined;
        }
      }
    }

    function handleReady(): void {
      previousReady?.();
      resolveIfReady();
    }

    function handleScriptError(): void {
      rejectOnce(new Error("Failed to load YouTube iframe API."));
    }

    function rejectOnce(error: Error): void {
      if (completed) {
        return;
      }
      completed = true;
      cleanup();
      reject(error);
    }

    function resolveIfReady(): void {
      if (completed) {
        return;
      }
      const api = window.YT;
      if (api?.Player) {
        completed = true;
        cleanup();
        resolve(api);
      }
    }

    window.onYouTubeIframeAPIReady = handleReady;

    if (!script) {
      script = document.createElement("script");
      script.src = youtubeIframeApiSrc;
      script.async = true;
      document.head.append(script);
    }
    script.addEventListener("error", handleScriptError, { once: true });
    resolveIfReady();
  });
}

function getYouTubePlayerOrigin(origin: string | undefined): string {
  if (origin) {
    return origin;
  }
  return window.location.origin;
}
