import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerYouTubeSource,
} from "../../core/vibe-player-types";
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
  handleStateChange: (state: YouTubePlayerState) => void;
  runtime: YouTubeAdapterRuntime;
  source: VibePlayerYouTubeSource;
}

export async function loadYouTubePlayer({
  abortController,
  element,
  emit,
  handleStateChange,
  runtime,
  source,
}: LoadYouTubePlayerInput): Promise<YouTubePlayerHandle> {
  const playerPromise = Promise.resolve(
    runtime.createPlayer({
      element,
      onError: (payload) => emit("error", payload),
      onPlaybackRateChange: () => emit("ratechange"),
      onReady: () => emit("ready"),
      onStateChange: handleStateChange,
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
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Timed out creating YouTube player."));
      abortController.abort();
    }, youtubePlayerCreationTimeoutMs);
    playerPromise
      .then((player) => {
        window.clearTimeout(timeoutId);
        resolve(player);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}
