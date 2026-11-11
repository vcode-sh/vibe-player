import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";
import { VibePlayerFramePickerStrip } from "./vibe-player-frame-picker-strip";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { vibePlayerClassName } from "./vibe-player-ui-context";

/** Seconds an arrow key moves the pick. */
export const VIBE_PLAYER_FRAME_PICKER_STEP = 0.1;
/** Seconds Page Up and Page Down move the pick. */
export const VIBE_PLAYER_FRAME_PICKER_PAGE_STEP = 1;

interface VibePlayerFramePickerRailProps {
  className?: string | undefined;
  /** Media duration in seconds; 0 until known, which disables the rail. */
  duration: number;
  label: string;
  onChange: (seconds: number) => void;
  seekThumbnails: readonly VibePlayerSeekThumbnail[] | undefined;
  stripClassName?: string | undefined;
  thumbClassName?: string | undefined;
  /** The picked time, already within the duration. */
  time: number;
  valueText: string;
  /** Video width / height, the filmstrip's fallback tile ratio. */
  videoRatio: number;
}

/** Millisecond precision keeps float noise out of the reported time. */
function round(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

function keyTarget(key: string, time: number, duration: number) {
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown":
      return time - VIBE_PLAYER_FRAME_PICKER_STEP;
    case "ArrowRight":
    case "ArrowUp":
      return time + VIBE_PLAYER_FRAME_PICKER_STEP;
    case "PageDown":
      return time - VIBE_PLAYER_FRAME_PICKER_PAGE_STEP;
    case "PageUp":
      return time + VIBE_PLAYER_FRAME_PICKER_PAGE_STEP;
    case "Home":
      return 0;
    case "End":
      return duration;
    default:
      return null;
  }
}

/**
 * The frame picker's ARIA slider: pointer down picks the time under it and
 * dragging follows the pointer (captured, so it may leave the rail); arrows
 * step 0.1 s, Page Up/Down 1 s, Home/End jump to the ends.
 */
export function VibePlayerFramePickerRail({
  className,
  duration,
  label,
  onChange,
  seekThumbnails,
  stripClassName,
  thumbClassName,
  time,
  valueText,
  videoRatio,
}: VibePlayerFramePickerRailProps) {
  const pointer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = !(duration > 0);
  const pick = (seconds: number) => {
    const next = round(Math.min(duration, Math.max(0, seconds)));
    if (next !== time) {
      onChange(next);
    }
  };
  const pointAt = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width > 0) {
      pick(((event.clientX - box.left) / box.width) * duration);
    }
  };
  const end = (event: PointerEvent<HTMLElement>) => {
    if (pointer.current === event.pointerId) {
      pointer.current = null;
      setDragging(false);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = disabled ? null : keyTarget(event.key, time, duration);
    if (target !== null) {
      event.preventDefault();
      pick(target);
    }
  };
  return (
    <div
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemax={round(duration)}
      aria-valuemin={0}
      aria-valuenow={round(time)}
      aria-valuetext={valueText}
      className={vibePlayerClassName(
        "vibe-player-frame-picker__rail",
        className
      )}
      data-dragging={dragging || undefined}
      data-part="rail"
      onKeyDown={onKeyDown}
      onPointerCancel={end}
      onPointerDown={(event) => {
        if (disabled || event.button > 0) {
          return;
        }
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
        pointer.current = event.pointerId;
        pointAt(event);
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) {
          pointAt(event);
        }
      }}
      onPointerUp={end}
      role="slider"
      style={
        {
          "--vibe-player-frame-picker-progress": disabled
            ? 0
            : (time / duration).toFixed(4),
        } as CSSProperties
      }
      tabIndex={disabled ? -1 : 0}
    >
      {seekThumbnails?.length && !disabled ? (
        <VibePlayerFramePickerStrip
          className={stripClassName}
          duration={duration}
          seekThumbnails={seekThumbnails}
          videoRatio={videoRatio}
        />
      ) : null}
      <span aria-hidden className="vibe-player-frame-picker__track" />
      <span aria-hidden className="vibe-player-frame-picker__thumb-track">
        <span
          className={vibePlayerClassName(
            "vibe-player-frame-picker__thumb",
            thumbClassName
          )}
          data-part="thumb"
        />
      </span>
    </div>
  );
}
