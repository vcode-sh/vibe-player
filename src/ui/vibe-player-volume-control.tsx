import { type FocusEvent, type KeyboardEvent, useId } from "react";
import {
  createVibePlayerVolumeState,
  type VibePlayerCapabilities,
  type VibePlayerSnapshot,
} from "../core";
import { useVibePlayerVolumePopover } from "./use-vibe-player-volume-popover";
import { VibePlayerToggleButton } from "./vibe-player-toggle-button";
import { VibePlayerTooltip } from "./vibe-player-tooltip";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";
import { VibePlayerVolumeIcon } from "./vibe-player-volume-icon";
import { getVibePlayerVolumeFromPercent } from "./vibe-player-volume-percent";
import { VibePlayerVolumePopover } from "./vibe-player-volume-popover";

const volumeStep = 5;
const volumeShiftStep = 10;

export interface VibePlayerVolumeControlProps {
  capabilities: VibePlayerCapabilities;
  onSetMuted: ((muted: boolean) => void) | undefined;
  onSetVolume: ((volume: number) => void) | undefined;
  onToggleMute: () => void;
  snapshot: VibePlayerSnapshot;
}

function getNextKeyboardPercent(
  event: KeyboardEvent<HTMLDivElement>,
  currentPercent: number
): number | null {
  const step = event.shiftKey ? volumeShiftStep : volumeStep;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") {
    return currentPercent + step;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
    return currentPercent - step;
  }
  if (event.key === "Home") {
    return 0;
  }
  if (event.key === "End") {
    return 100;
  }
  return null;
}

export function VibePlayerVolumeControl({
  capabilities,
  onSetMuted,
  onSetVolume,
  onToggleMute,
  snapshot,
}: VibePlayerVolumeControlProps) {
  const { classNames, labels } = useVibePlayerUI();
  const popoverId = useId();
  const popover = useVibePlayerVolumePopover();
  const volumeState = createVibePlayerVolumeState(snapshot);
  const setVolume = onSetVolume;
  const canSetVolume = capabilities.supportsVolumeControl && setVolume;
  const canMute = capabilities.supportsMute;

  if (!canSetVolume) {
    if (!canMute) {
      return null;
    }
    const label = snapshot.muted ? labels.unmute : labels.mute;
    return (
      <VibePlayerToggleButton label={label} onClick={onToggleMute}>
        <VibePlayerVolumeIcon
          silent={volumeState.silent}
          volume={snapshot.volume}
        />
      </VibePlayerToggleButton>
    );
  }

  const actionLabel = snapshot.muted ? labels.unmute : labels.mute;
  const setSupportedVolume: (volume: number) => void = setVolume;
  const triggerLabel = canMute
    ? labels.volumeTrigger(actionLabel, volumeState.percent)
    : labels.volumeValue(volumeState.percent, snapshot.muted);

  function closePopover(): void {
    popover.closePopover();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    const { relatedTarget } = event;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }
    closePopover();
  }

  function handleFocus(): void {
    popover.holdPopover();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && popover.open) {
      // Consumed: a host dialog must not also close on this press.
      event.preventDefault();
      event.stopPropagation();
      popover.closePopover(true);
    }
  }

  function handlePointerEnter(): void {
    popover.holdPopover();
  }

  function handlePointerLeave(): void {
    popover.releasePopover();
  }

  function handleSliderKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const nextPercent = getNextKeyboardPercent(event, volumeState.percent);
    if (nextPercent !== null) {
      event.preventDefault();
      setVolumeFromPercent(nextPercent);
    }
  }

  function setVolumeFromPercent(percent: number): void {
    const volume = getVibePlayerVolumeFromPercent(percent);
    setSupportedVolume(volume);
    if (volume > 0 && snapshot.muted) {
      if (onSetMuted) {
        onSetMuted(false);
      } else {
        onToggleMute();
      }
    }
    popover.scheduleCommitDismiss();
  }

  function handleTriggerClick(): void {
    if (canMute) {
      onToggleMute();
      popover.scheduleCommitDismiss();
      return;
    }
    popover.holdPopover();
    popover.scheduleCommitDismiss();
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions lint/a11y/noStaticElementInteractions: the wrapper owns focus-exit and Escape behavior for the volume popover composite.
    <div
      className="vibe-player-volume-control"
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onMouseMove={handlePointerEnter}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerEnter}
      ref={popover.rootRef}
    >
      <VibePlayerTooltip
        disabled={popover.open}
        label={actionLabel}
        shortcut={canMute ? labels.muteShortcut : undefined}
      >
        <button
          aria-controls={popover.open ? popoverId : undefined}
          aria-expanded={popover.open}
          aria-haspopup="dialog"
          aria-label={triggerLabel}
          className={vibePlayerClassName(
            "vibe-player-controls__button vibe-player-volume-control__trigger",
            classNames.button
          )}
          onClick={handleTriggerClick}
          ref={popover.triggerRef}
          type="button"
        >
          <VibePlayerVolumeIcon
            silent={volumeState.silent}
            volume={snapshot.volume}
          />
        </button>
      </VibePlayerTooltip>
      {popover.open ? (
        <VibePlayerVolumePopover
          active={popover.active}
          id={popoverId}
          onCommitPercent={setVolumeFromPercent}
          onSliderKeyDown={handleSliderKeyDown}
          percent={volumeState.percent}
          pointerActiveRef={popover.pointerActiveRef}
          scheduleCommitDismiss={popover.scheduleCommitDismiss}
          setActive={popover.setActive}
          sliderRef={popover.sliderRef}
          valueText={labels.volumeValue(volumeState.percent, snapshot.muted)}
        />
      ) : null}
    </div>
  );
}
