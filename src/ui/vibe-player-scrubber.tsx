import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from "react";
import type { VibePlayerSurface } from "./vibe-player-surface-types";
import {
  useVibePlayerUI,
  VibePlayerTimelineBackgroundLayer,
  vibePlayerClassName,
} from "./vibe-player-ui-context";

/** Styleable seek track; the visual parts are spans the skin CSS draws. */
export interface VibePlayerScrubberProps {
  /** Rides the thumb, e.g. a time bubble shown while scrubbing. */
  bubble?: ReactNode;
  className?: string | undefined;
  /** False leaves pointer scrubbing to the host surface; keys still work. */
  interactive?: boolean | undefined;
  surface: VibePlayerSurface;
}

/**
 * An ARIA slider over the surface scrub session. Arrow keys reach the
 * player's seek shortcut; Home and End jump to the ends.
 */
export function VibePlayerScrubber({
  bubble,
  className,
  interactive = true,
  surface,
}: VibePlayerScrubberProps) {
  const { classNames, formatTime, labels } = useVibePlayerUI();
  const rail = useRef<HTMLSpanElement>(null);
  const pointer = useRef<number | null>(null);
  const { actions, state } = surface;
  const fraction = (event: PointerEvent<HTMLElement>) => {
    const box = rail.current?.getBoundingClientRect();
    return box && box.width > 0 ? (event.clientX - box.left) / box.width : 0;
  };
  const end = (event: PointerEvent<HTMLElement>) => {
    if (pointer.current === event.pointerId) {
      pointer.current = null;
      actions.scrubEnd();
    }
  };
  const pointerEvents = interactive
    ? {
        onPointerCancel: end,
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
          if (event.button > 0) {
            return;
          }
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          pointer.current = event.pointerId;
          actions.scrubStart();
          actions.scrubTo(fraction(event));
        },
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
          if (pointer.current === event.pointerId) {
            actions.scrubTo(fraction(event));
          }
        },
        onPointerUp: end,
      }
    : {};
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const target = event.key === "Home" ? 0 : state.duration;
      actions.seekBy(target - (state.previewTime ?? state.time));
    }
  };
  return (
    <div
      aria-label={labels.seek}
      aria-valuemax={Math.round(state.duration)}
      aria-valuemin={0}
      aria-valuenow={Math.round(state.time)}
      aria-valuetext={labels.seekValue(
        formatTime(state.time),
        formatTime(state.duration)
      )}
      className={vibePlayerClassName(
        "vibe-player-scrubber",
        className,
        classNames.progress
      )}
      data-part="track"
      onKeyDown={onKeyDown}
      role="slider"
      tabIndex={0}
      {...pointerEvents}
    >
      <VibePlayerTimelineBackgroundLayer
        className="vibe-player-scrubber__background"
        duration={state.duration}
      />
      <span className="vibe-player-scrubber__rail" ref={rail}>
        <span className="vibe-player-scrubber__fill" />
      </span>
      <span className="vibe-player-scrubber__thumb-track">
        <span className="vibe-player-scrubber__thumb" />
        {bubble}
      </span>
    </div>
  );
}
