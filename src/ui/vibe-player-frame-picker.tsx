import { type SyntheticEvent, useEffect, useRef } from "react";
import { formatVibePlayerTime } from "../core/vibe-player-time";
import { useVibePlayer } from "../react/use-vibe-player";
import { selectVibePlayerSeekThumbnail } from "./select-vibe-player-seek-thumbnail";
import { useVibePlayerFramePickerSeek } from "./use-vibe-player-frame-picker-seek";
import { VibePlayerFramePickerRail } from "./vibe-player-frame-picker-rail";
import type { VibePlayerFramePickerProps } from "./vibe-player-frame-picker-types";
import { getVibePlayerFrameStyle } from "./vibe-player-frame-style";
import { VibePlayerSeekThumbnailImage } from "./vibe-player-seek-thumbnail";
import { vibePlayerClassName } from "./vibe-player-ui-context";

/** `0:07.3 of 1:05`: tenths matter when an arrow moves 0.1 s. */
function defaultValueText(seconds: number, duration: number): string {
  const tenths = Math.round(seconds * 10);
  const time = formatVibePlayerTime(Math.floor(tenths / 10));
  return `${time}.${tenths % 10} of ${formatVibePlayerTime(duration)}`;
}

function clampTime(value: number, duration: number): number {
  return Number.isFinite(value) ? Math.min(duration, Math.max(0, value)) : 0;
}

/**
 * The adapter defaults media to `preload="none"`; the picker needs the frame
 * now, so it lifts that whenever a load starts. The media never plays.
 */
function preloadFrame(event: SyntheticEvent<HTMLVideoElement>): void {
  event.currentTarget.preload = "auto";
}

/**
 * A paused, muted frame of a file or HLS source at `value`, above an ARIA
 * slider (with a storyboard filmstrip when `seekThumbnails` is given) that
 * picks it. Seeks run one at a time; while one is in flight the storyboard
 * tile at `value` covers the frame, so dragging answers at once.
 */
export function VibePlayerFramePicker({
  className,
  classNames,
  fit,
  labels,
  onChange,
  seekThumbnails,
  source,
  value,
  ...options
}: VibePlayerFramePickerProps) {
  const { controller, setTarget, state } = useVibePlayer({
    ...options,
    audioFocus: false,
    load: "eager",
    pauseWhenHidden: false,
    source,
    stopWhenOffscreen: false,
  });
  const { snapshot } = state;
  const duration =
    state.error || state.capabilities?.isLive ? 0 : snapshot.duration;
  const time = clampTime(value, duration);
  const seeking = useVibePlayerFramePickerSeek(
    controller,
    state.currentSource,
    duration,
    time
  );
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    if (duration > 0 && time !== value) {
      change.current(time);
    }
  }, [duration, time, value]);
  const tile =
    seeking && duration > 0
      ? selectVibePlayerSeekThumbnail(seekThumbnails, time, duration)
      : undefined;
  const activeSource = state.currentSource ?? source;
  const frame = getVibePlayerFrameStyle({ snapshot, source: activeSource });
  const width = activeSource.width ?? snapshot.videoWidth ?? 0;
  const height = activeSource.height ?? snapshot.videoHeight ?? 0;
  return (
    <div
      className={vibePlayerClassName(
        "vibe-player-frame-picker",
        className,
        classNames?.root
      )}
      data-fit={fit === "cover" ? "cover" : undefined}
      data-seeking={seeking || undefined}
      data-state={state.error ? "error" : undefined}
    >
      <div
        className={vibePlayerClassName(
          "vibe-player-frame-picker__frame",
          classNames?.frame
        )}
        data-part="frame"
        style={frame}
      >
        <video
          aria-hidden
          className={vibePlayerClassName(
            "vibe-player-frame-picker__media",
            classNames?.media
          )}
          disablePictureInPicture
          muted
          onLoadStart={preloadFrame}
          playsInline
          ref={setTarget}
          tabIndex={-1}
        />
        {tile ? (
          <span
            className={vibePlayerClassName(
              "vibe-player-frame-picker__tile",
              classNames?.tile
            )}
            data-part="tile"
          >
            <VibePlayerSeekThumbnailImage
              className="vibe-player-frame-picker__tile-image"
              key={tile.url}
              thumbnail={tile}
            />
          </span>
        ) : null}
      </div>
      <VibePlayerFramePickerRail
        className={classNames?.rail}
        duration={duration}
        label={labels?.slider ?? "Cover frame"}
        onChange={onChange}
        seekThumbnails={seekThumbnails}
        stripClassName={classNames?.strip}
        thumbClassName={classNames?.thumb}
        time={time}
        valueText={(labels?.valueText ?? defaultValueText)(time, duration)}
        videoRatio={width > 0 && height > 0 ? width / height : 16 / 9}
      />
    </div>
  );
}
