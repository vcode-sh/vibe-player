import type { VibePlayerController } from "./vibe-player-controller";
import type {
  VibePlayerMediaSessionAction,
  VibePlayerMediaSessionHandler,
} from "./vibe-player-media-session-sync";
import type { VibePlayerMediaSessionOptions } from "./vibe-player-media-session-types";
import type { VibePlayerCapabilities } from "./vibe-player-types";

const DEFAULT_SEEK_OFFSET_SECONDS = 10;

function ignore(command: Promise<void>): void {
  command.catch(() => undefined);
}

/**
 * Scrubbing a system seek bar sends a burst of `seekto` actions marked
 * `fastSeek`; while one seek is running only the latest of those waits, and
 * the final action of the burst always seeks.
 */
function createSeekQueue(seek: (seconds: number) => Promise<void>) {
  let running = 0;
  let pending: number | null = null;
  const run = (seconds: number): void => {
    running += 1;
    pending = null;
    seek(seconds)
      .catch(() => undefined)
      .finally(() => {
        running -= 1;
        if (pending !== null && running === 0) {
          run(pending);
        }
      });
  };
  return (seconds: number, fast: boolean) => {
    if (fast && running > 0) {
      pending = seconds;
    } else {
      run(seconds);
    }
  };
}

/** Stable action handlers that always read the latest options and state. */
export function createVibePlayerMediaSessionHandlers(
  controller: VibePlayerController,
  getOptions: () => VibePlayerMediaSessionOptions
) {
  const seek = createSeekQueue((seconds) => controller.seekTo(seconds));
  const seekTo = (seconds: number, fast = false) => {
    const { duration } = controller.getState().snapshot;
    const end = Number.isFinite(duration) && duration > 0 ? duration : seconds;
    seek(Math.min(Math.max(seconds, 0), end), fast);
  };
  const seekBy = (seconds: number) =>
    seekTo(controller.getState().snapshot.currentTime + seconds);
  const all: Record<
    VibePlayerMediaSessionAction,
    VibePlayerMediaSessionHandler
  > = {
    enterpictureinpicture: () => ignore(controller.enterPictureInPicture()),
    nexttrack: () => getOptions().onNextTrack?.(),
    pause: () => ignore(controller.pause()),
    play: () => ignore(controller.play()),
    previoustrack: () => getOptions().onPreviousTrack?.(),
    seekbackward: ({ seekOffset }) =>
      seekBy(
        -(
          seekOffset ??
          getOptions().seekBackwardSeconds ??
          DEFAULT_SEEK_OFFSET_SECONDS
        )
      ),
    seekforward: ({ seekOffset }) =>
      seekBy(
        seekOffset ??
          getOptions().seekForwardSeconds ??
          DEFAULT_SEEK_OFFSET_SECONDS
      ),
    seekto: ({ fastSeek, seekTime }) => {
      if (typeof seekTime === "number" && Number.isFinite(seekTime)) {
        seekTo(seekTime, fastSeek === true);
      }
    },
    stop: () => ignore(controller.stop()),
  };

  /** The actions this player can honestly perform right now, in order. */
  const select = (capabilities: VibePlayerCapabilities | null) => {
    const options = getOptions();
    const actions: VibePlayerMediaSessionAction[] = ["play", "pause", "stop"];
    if (capabilities?.canSeek) {
      actions.push("seekbackward", "seekforward", "seekto");
    }
    if (options.onPreviousTrack) {
      actions.push("previoustrack");
    }
    if (options.onNextTrack) {
      actions.push("nexttrack");
    }
    if (
      options.pictureInPicture !== false &&
      capabilities?.canPictureInPicture
    ) {
      actions.push("enterpictureinpicture");
    }
    return new Map(actions.map((action) => [action, all[action]]));
  };
  return { select };
}
