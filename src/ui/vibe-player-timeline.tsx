import {
  type FocusEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { formatVibePlayerTime } from "../core";
import { VibePlayerSeekPreview } from "./vibe-player-seek-preview";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

export interface VibePlayerTimelineProps {
  currentTime: number;
  disabled?: boolean;
  duration: number;
  onSeek: (seconds: number) => void;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
}

interface PointerPosition {
  x: number;
  y: number;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function getPointerPercent(event: PointerEvent<HTMLDivElement>): number | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0) {
    return null;
  }
  return clampPercent(((event.clientX - rect.left) / rect.width) * 100);
}

function timeFromPercent(duration: number, percent: number): number {
  return duration <= 0 ? 0 : (duration * percent) / 100;
}

export function VibePlayerTimeline({
  currentTime,
  disabled = false,
  duration,
  onSeek,
  seekThumbnails,
}: VibePlayerTimelineProps) {
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pointerPositionRef = useRef<PointerPosition | null>(null);
  const pointerSeekingRef = useRef<number | null>(null);
  const hasDuration = duration > 0 && !disabled;
  const progress = hasDuration
    ? clampPercent((currentTime / duration) * 100)
    : 0;
  const hoverTime =
    hoverPercent === null ? null : timeFromPercent(duration, hoverPercent);
  const tooltipTime =
    hoverTime ?? (focused && hasDuration ? currentTime : null);
  const rawTooltipPercent = hoverPercent ?? progress;

  useEffect(() => {
    const pointerId = pointerSeekingRef.current;
    if (hasDuration || pointerId === null) {
      return;
    }
    pointerSeekingRef.current = null;
    const root = inputRef.current?.parentElement;
    if (root?.hasPointerCapture(pointerId)) {
      root.releasePointerCapture(pointerId);
    }
  }, [hasDuration]);

  const updateHover = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const previous = pointerPositionRef.current;
    // A stationary pointer must not replace a keyboard seek preview.
    if (previous?.x === event.clientX && previous.y === event.clientY) {
      return;
    }
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    setHoverPercent(getPointerPercent(event));
  }, []);

  const seekFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
      const percent = getPointerPercent(event);
      setHoverPercent(percent);
      if (percent !== null) {
        onSeek(timeFromPercent(duration, percent));
      }
    },
    [duration, onSeek]
  );

  const stopPointerSeek = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (pointerSeekingRef.current !== event.pointerId) {
      return;
    }
    pointerSeekingRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  function handleInputBlur(event: FocusEvent<HTMLInputElement>): void {
    setFocused(false);
    if (pointerSeekingRef.current === null) {
      setHoverPercent(null);
    }
    event.currentTarget.blur();
  }

  return (
    <div
      className="vibe-player-timeline"
      data-disabled={!hasDuration}
      data-vibe-player-timeline
      onLostPointerCapture={stopPointerSeek}
      onPointerCancel={stopPointerSeek}
      onPointerDown={(event) => {
        if (
          !hasDuration ||
          pointerSeekingRef.current !== null ||
          event.isPrimary === false ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        pointerSeekingRef.current = event.pointerId;
        inputRef.current?.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        seekFromPointer(event);
      }}
      onPointerEnter={updateHover}
      onPointerLeave={() => {
        if (pointerSeekingRef.current === null) {
          pointerPositionRef.current = null;
          setHoverPercent(null);
        }
      }}
      onPointerMove={(event) => {
        if (pointerSeekingRef.current !== null) {
          if (pointerSeekingRef.current === event.pointerId && hasDuration) {
            seekFromPointer(event);
          }
          return;
        }
        updateHover(event);
      }}
      onPointerUp={stopPointerSeek}
    >
      <input
        aria-label="Seek"
        aria-valuetext={`${formatVibePlayerTime(currentTime)} of ${formatVibePlayerTime(duration)}`}
        className="vibe-player-timeline__input"
        disabled={!hasDuration}
        max={duration || 0}
        min={0}
        onBlur={handleInputBlur}
        onChange={(event) => {
          setHoverPercent(null);
          onSeek(Number(event.currentTarget.value));
        }}
        onFocus={() => setFocused(true)}
        ref={inputRef}
        step={0.1}
        type="range"
        value={hasDuration ? currentTime : 0}
      />
      <span aria-hidden className="vibe-player-timeline__focus" />
      <div aria-hidden className="vibe-player-timeline__track">
        <div className="vibe-player-timeline__base" />
        <div
          className="vibe-player-timeline__progress"
          style={{ width: `${progress}%` }}
        />
        {hasDuration ? (
          <span
            className="vibe-player-timeline__point"
            style={{ left: `${progress}%` }}
          />
        ) : null}
        {hoverPercent === null || !hasDuration ? null : (
          <span
            className="vibe-player-timeline__ghost"
            style={{ left: `${hoverPercent}%` }}
          />
        )}
      </div>
      {tooltipTime === null || !hasDuration ? null : (
        <VibePlayerSeekPreview
          duration={duration}
          percent={rawTooltipPercent}
          seekThumbnails={seekThumbnails}
          time={tooltipTime}
        />
      )}
    </div>
  );
}
