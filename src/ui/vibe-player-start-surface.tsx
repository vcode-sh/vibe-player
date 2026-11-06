import type { VibePlayerController } from "../core/vibe-player-controller";
import type { VibePlayerSnapshot } from "../core/vibe-player-runtime-types";
import type { VibePlayerSource } from "../core/vibe-player-source-types";
import { PlayIcon } from "./vibe-player-icons";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

interface VibePlayerStartSurfaceProps {
  controller: VibePlayerController;
  snapshot: VibePlayerSnapshot;
  source: VibePlayerSource;
}

/** The idle poster is independent of the video engine and its requests. */
export function VibePlayerStartSurface({
  controller,
  snapshot,
  source,
}: VibePlayerStartSurfaceProps) {
  const { classNames, formatTime, labels } = useVibePlayerUI();
  const idle = snapshot.readyState === "idle";
  const showPoster = idle || snapshot.readyState === "error";
  const duration = snapshot.duration || source.durationSeconds;
  return (
    <>
      <VibePlayerPoster
        controller={controller}
        source={source}
        visible={showPoster}
      />
      {idle ? (
        <button
          aria-label={labels.play}
          className={vibePlayerClassName(
            "vibe-player-stage__start",
            classNames.playButton,
            classNames.button
          )}
          onClick={(event) => {
            // This button unmounts on Play; keep focus inside the player.
            if (event.currentTarget === document.activeElement) {
              event.currentTarget.parentElement?.focus({ preventScroll: true });
            }
            controller.play().catch(() => undefined);
          }}
          type="button"
        >
          <PlayIcon />
        </button>
      ) : null}
      {idle && duration ? (
        <span
          className={vibePlayerClassName(
            "vibe-player-stage__duration",
            classNames.duration
          )}
        >
          {formatTime(duration)}
        </span>
      ) : null}
    </>
  );
}

interface VibePlayerPosterProps {
  controller: VibePlayerController;
  source: VibePlayerSource;
  visible: boolean;
}

/** A failed private poster renews its delivery once, without loading media. */
export function VibePlayerPoster({
  controller,
  source,
  visible,
}: VibePlayerPosterProps) {
  const { classNames } = useVibePlayerUI();
  if (!(visible && source.posterUrl)) {
    return null;
  }
  return (
    <img
      alt=""
      aria-hidden
      className={vibePlayerClassName(
        "vibe-player-stage__poster",
        classNames.poster
      )}
      data-part="poster"
      decoding="async"
      draggable={false}
      height={source.height ?? 1080}
      loading="lazy"
      onError={() => {
        controller.renewPoster().catch(() => undefined);
      }}
      src={source.posterUrl}
      width={source.width ?? 1920}
    />
  );
}
