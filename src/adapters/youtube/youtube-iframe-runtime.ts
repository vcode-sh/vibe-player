import type {
  YouTubeAdapterRuntime,
  YouTubeIframeApi,
} from "./youtube-iframe-types";
import { createReadyYouTubePlayer } from "./youtube-player-creation";

let youtubeApiPromise: Promise<YouTubeIframeApi> | null = null;

const youtubeIframeApiSrc = "https://www.youtube.com/iframe_api";
const youtubeIframeApiTimeoutMs = 8000;
const youtubeIframeApiPollMs = 50;

export const defaultYouTubeAdapterRuntime: YouTubeAdapterRuntime = {
  async createPlayer(session) {
    const api = await loadYouTubeIframeApi();
    return createReadyYouTubePlayer(api, session);
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
