import type {
  CSSProperties,
  KeyboardEvent,
  MutableRefObject,
  PointerEvent,
  RefObject,
} from "react";
import { clampVibePlayerVolumePercent } from "./vibe-player-volume-percent";

const volumeHashMarks = [0, 25, 50, 75, 100];

export interface VibePlayerVolumePopoverProps {
  active: boolean;
  id: string;
  onCommitPercent: (percent: number) => void;
  onSliderKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  percent: number;
  pointerActiveRef: MutableRefObject<boolean>;
  scheduleCommitDismiss: () => void;
  setActive: (active: boolean) => void;
  sliderRef: RefObject<HTMLDivElement | null>;
  valueText: string;
}

interface VibePlayerVolumeSliderStyle extends CSSProperties {
  "--vibe-player-volume-percent"?: string;
}

function getPercentFromPointer(
  event: PointerEvent<HTMLDivElement>
): number | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.height <= 0) {
    return null;
  }
  return clampVibePlayerVolumePercent(
    ((rect.bottom - event.clientY) / rect.height) * 100
  );
}

export function VibePlayerVolumePopover({
  active,
  id,
  onCommitPercent,
  onSliderKeyDown,
  percent,
  pointerActiveRef,
  scheduleCommitDismiss,
  setActive,
  sliderRef,
  valueText,
}: VibePlayerVolumePopoverProps) {
  function setVolumeFromPointer(event: PointerEvent<HTMLDivElement>): void {
    const nextPercent = getPercentFromPointer(event);
    if (nextPercent !== null) {
      onCommitPercent(nextPercent);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.isPrimary === false) {
      return;
    }
    event.preventDefault();
    pointerActiveRef.current = true;
    setActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    sliderRef.current?.focus({ preventScroll: true });
    setVolumeFromPointer(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (pointerActiveRef.current) {
      setVolumeFromPointer(event);
    }
  }

  function stopPointer(event: PointerEvent<HTMLDivElement>): void {
    pointerActiveRef.current = false;
    setActive(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scheduleCommitDismiss();
  }

  const sliderStyle: VibePlayerVolumeSliderStyle = {
    "--vibe-player-volume-percent": `${percent}%`,
  };

  return (
    <div
      aria-label="Volume"
      className="vibe-player-volume-control__popover"
      id={id}
      role="dialog"
    >
      <div
        aria-label="Volume"
        aria-orientation="vertical"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        aria-valuetext={valueText}
        className="vibe-player-volume-control__slider"
        data-active={active || undefined}
        onBlur={() => setActive(false)}
        onFocus={() => setActive(true)}
        onKeyDown={onSliderKeyDown}
        onPointerCancel={stopPointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPointer}
        ref={sliderRef}
        role="slider"
        style={sliderStyle}
        tabIndex={0}
      >
        <span aria-hidden className="vibe-player-volume-control__hash-marks">
          {volumeHashMarks.map((hashPercent) => (
            <span
              className="vibe-player-volume-control__hash-mark"
              key={hashPercent}
              style={{ bottom: `${hashPercent}%` }}
            />
          ))}
        </span>
        <span aria-hidden className="vibe-player-volume-control__rail">
          <span className="vibe-player-volume-control__fill" />
          <span className="vibe-player-volume-control__thumb" />
        </span>
      </div>
      <output aria-hidden className="vibe-player-volume-control__readout">
        {percent}%
      </output>
    </div>
  );
}
