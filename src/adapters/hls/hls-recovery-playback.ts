import { isVibePlayerPlaybackBlockedError } from "../../core/vibe-player-errors";
import {
  type NativeVideoCommandInput,
  playGuardedNativeVideo,
} from "../native/native-video-playback";

/**
 * Captures playback before hls.js resets the media to recover it (or, with
 * `playedBeforeFailure`, media a decode failure has just paused). The reset
 * pauses the element without a `pause` event, so the returned function plays
 * it again under the same playback intent: a pause, play or load in between
 * changes the generation and cancels the resume, and so does a session that
 * failed meanwhile. A blocked `play()` reports `playblocked`, as a blocked
 * play command does; other rejections (a newer pause or load interrupted it)
 * are explained by the media's own events.
 */
export function captureHlsRecoveryPlayback(
  input: NativeVideoCommandInput,
  hasFailed: () => boolean,
  playedBeforeFailure = false
): (() => void) | undefined {
  const video = input.getVideo();
  if (!video || (video.paused && !playedBeforeFailure)) {
    return undefined;
  }
  const generation = input.getPlaybackGeneration();
  return () => {
    if (
      hasFailed() ||
      input.getVideo() !== video ||
      input.getPlaybackGeneration() !== generation
    ) {
      return;
    }
    playGuardedNativeVideo({
      expectedGeneration: generation,
      getActiveVideo: input.getVideo,
      getCurrentGeneration: input.getPlaybackGeneration,
      isMounted: input.isMounted,
      video,
    }).catch((error: unknown) => {
      if (isVibePlayerPlaybackBlockedError(error)) {
        input.emit("playblocked");
      }
    });
  };
}
