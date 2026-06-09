import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerYouTubeSource,
} from "../core/vibe-player-types";
import type {
  YouTubeAdapterRuntime,
  YouTubePlayerHandle,
  YouTubePlayerState,
} from "./youtube-iframe-types";

const youtubePlayerCreationTimeoutMs = 8000;

export interface LoadYouTubePlayerInput {
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
    return await withYouTubePlayerCreationTimeout(playerPromise);
  } catch (error) {
    playerPromise.then((player) => player.destroy()).catch(() => undefined);
    throw error;
  }
}

function withYouTubePlayerCreationTimeout(
  playerPromise: Promise<YouTubePlayerHandle>
): Promise<YouTubePlayerHandle> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => reject(new Error("Timed out creating YouTube player.")),
      youtubePlayerCreationTimeoutMs
    );
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
