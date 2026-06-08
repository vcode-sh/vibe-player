import { type PointerEvent, useCallback, useRef, useState } from "react";
import { formatVibePlayerTime } from "../core";

export interface VibePlayerTimelineProps {
  currentTime: number;
  disabled?: boolean;
  duration: number;
  onSeek: (seconds: number) => void;
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
}: VibePlayerTimelineProps) {
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const pointerSeekingRef = useRef(false);
  const hasDuration = duration > 0 && !disabled;
  const progress = hasDuration
    ? clampPercent((currentTime / duration) * 100)
    : 0;
  const hoverTime =
    hoverPercent === null ? null : timeFromPercent(duration, hoverPercent);
  const tooltipPercent =
    hoverPercent === null ? 0 : Math.min(94, Math.max(6, hoverPercent));

  const updateHover = useCallback((event: PointerEvent<HTMLDivElement>) => {
    setHoverPercent(getPointerPercent(event));
  }, []);

  const seekFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const percent = getPointerPercent(event);
      setHoverPercent(percent);
      if (percent !== null) {
        onSeek(timeFromPercent(duration, percent));
      }
    },
    [duration, onSeek]
  );

  const stopPointerSeek = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointerSeekingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <div
      className="vibe-player-timeline"
      data-vibe-player-timeline
      onPointerCancel={stopPointerSeek}
      onPointerDown={(event) => {
        if (!hasDuration || event.isPrimary === false) {
          return;
        }
        pointerSeekingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        seekFromPointer(event);
      }}
      onPointerEnter={updateHover}
      onPointerLeave={() => {
        if (!pointerSeekingRef.current) {
          setHoverPercent(null);
        }
      }}
      onPointerMove={(event) => {
        if (pointerSeekingRef.current) {
          seekFromPointer(event);
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
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
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
      {hoverTime === null || !hasDuration ? null : (
        <output
          className="vibe-player-timeline__tooltip"
          style={{ left: `${tooltipPercent}%` }}
        >
          {formatVibePlayerTime(hoverTime)}
        </output>
      )}
    </div>
  );
}
