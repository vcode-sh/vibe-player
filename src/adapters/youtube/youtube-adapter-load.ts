import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerYouTubeSource,
} from "../../core/vibe-player-types";
import { getYouTubeControlsMode } from "./youtube-controls-mode";
import type {
  YouTubeAdapterRuntime,
  YouTubePlayerHandle,
  YouTubePlayerState,
} from "./youtube-iframe-types";

const youtubePlayerCreationTimeoutMs = 8000;

export interface LoadYouTubePlayerInput {
  abortController: AbortController;
  element: HTMLElement;
  emit: (
    type: VibePlayerEventName,
    payload?: VibePlayerAdapterEvent["payload"]
  ) => void;
  handleAutoplayBlocked: () => void;
  handleStateChange: (state: YouTubePlayerState) => void;
  runtime: YouTubeAdapterRuntime;
  source: VibePlayerYouTubeSource;
}

export async function loadYouTubePlayer({
  abortController,
  element,
  emit,
  handleAutoplayBlocked,
  handleStateChange,
  runtime,
  source,
}: LoadYouTubePlayerInput): Promise<YouTubePlayerHandle> {
  const playerPromise = Promise.resolve(
    runtime.createPlayer({
      ...(source.captionLanguage
        ? { captionLanguage: source.captionLanguage }
        : {}),
      controls: getYouTubeControlsMode(source),
      element,
      onAutoplayBlocked: handleAutoplayBlocked,
      onError: (payload) => emit("error", payload),
      onPlaybackRateChange: () => emit("ratechange"),
      // The adapter publishes readiness after committing the returned handle.
      onReady: () => undefined,
      onStateChange: handleStateChange,
      ...(source.showCaptionsByDefault ? { showCaptionsByDefault: true } : {}),
      signal: abortController.signal,
      ...(source.startSeconds === undefined
        ? {}
        : { startSeconds: source.startSeconds }),
      ...(source.origin ? { origin: source.origin } : {}),
      videoId: source.youtubeVideoId,
      ...(source.widgetReferrer
        ? { widgetReferrer: source.widgetReferrer }
        : {}),
    })
  );
  try {
    return await withYouTubePlayerCreationTimeout(
      playerPromise,
      abortController
    );
  } catch (error) {
    playerPromise.then((player) => player.destroy()).catch(() => undefined);
    throw error;
  }
}

function withYouTubePlayerCreationTimeout(
  playerPromise: Promise<YouTubePlayerHandle>,
  abortController: AbortController
): Promise<YouTubePlayerHandle> {
  return new Promise((resolve, reject) => {
    const { signal } = abortController;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out creating YouTube player."));
      abortController.abort();
    }, youtubePlayerCreationTimeoutMs);
    function cleanup(): void {
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", handleAbort);
    }
    function handleAbort(): void {
      cleanup();
      reject(
        new DOMException("YouTube player creation cancelled.", "AbortError")
      );
    }
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
    }
    playerPromise
      .then((player) => {
        cleanup();
        resolve(player);
      })
      .catch((error: unknown) => {
        cleanup();
        reject(error);
      });
  });
}
