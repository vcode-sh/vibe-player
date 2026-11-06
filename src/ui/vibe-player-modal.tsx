import type {
  KeyboardEvent,
  PropsWithChildren,
  ReactNode,
  SyntheticEvent,
} from "react";
import { useState } from "react";
import type { VibePlayerControllerState, VibePlayerSource } from "../core";
import { createIdleSnapshot } from "../core/vibe-player-time";
import { useVibePlayerOverlayPresence } from "../react";
import { useVibePlayerModal } from "./use-vibe-player-modal";
import { getVibePlayerFrameStyle } from "./vibe-player-frame-style";
import { defaultVibePlayerLabels } from "./vibe-player-labels";
import { wrapVibePlayerModalTabFocus } from "./vibe-player-modal-focus";
import { VibePlayerShell } from "./vibe-player-shell";
import { VibePlayerStage } from "./vibe-player-stage";
import type { VibePlayerPlaybackOptions } from "./vibe-player-stage-types";

export interface VibePlayerModalProps
  extends PropsWithChildren,
    VibePlayerPlaybackOptions {
  /**
   * Opening the viewer is a deliberate act, so playback starts audibly on
   * open. Pass false to wait for Play. A browser that still blocks sound
   * shows the play-to-start notice.
   */
  autoPlay?: boolean | undefined;
  /** Defaults to false: the open gesture already permits sound. */
  autoPlayMutedBootstrap?: boolean | undefined;
  footer?: ReactNode;
  header?: ReactNode;
  onClose?: () => void;
  open: boolean;
  source?: VibePlayerSource | null;
  title?: string;
}

export function VibePlayerModal({
  children,
  autoFocus = true,
  autoPlay = true,
  autoPlayMutedBootstrap = false,
  footer,
  header,
  onClose,
  open,
  source = null,
  title,
  ...playback
}: VibePlayerModalProps) {
  const [playbackState, setPlaybackState] =
    useState<VibePlayerControllerState | null>(null);
  const { rendered, state } = useVibePlayerOverlayPresence(open);
  const setDialogRef = useVibePlayerModal(open && state === "open");
  if (!rendered) {
    return null;
  }

  const playerTitle = title ?? source?.title;
  const labels = { ...defaultVibePlayerLabels, ...playback.labels };
  const matchingState =
    playbackState?.currentSource?.id === source?.id ? playbackState : null;
  const frameStyle = source
    ? getVibePlayerFrameStyle({
        maxRatio: playback.maxRatio,
        minRatio: playback.minRatio,
        snapshot: matchingState?.snapshot ?? createIdleSnapshot(),
        source: matchingState?.currentSource ?? source,
      })
    : undefined;
  const backdropStyle = source?.posterUrl
    ? { backgroundImage: `url("${source.posterUrl}")` }
    : undefined;
  const body = source ? (
    <VibePlayerStage
      {...playback}
      autoFocus={autoFocus}
      autoPlay={autoPlay}
      autoPlayMutedBootstrap={autoPlayMutedBootstrap}
      onClose={onClose}
      onStateChange={(next) => {
        setPlaybackState(next);
        playback.onStateChange?.(next);
      }}
      open={state === "open"}
      source={source}
      title={playerTitle}
    />
  ) : (
    children
  );

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    if (open) {
      onClose?.();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.defaultPrevented || !open) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("dialog") !== event.currentTarget
    ) {
      return;
    }
    if (event.key === "Tab") {
      if (wrapVibePlayerModalTabFocus(event.currentTarget, event.shiftKey)) {
        event.preventDefault();
      }
      return;
    }
    if (
      event.key !== "Escape" ||
      event.currentTarget.ownerDocument.fullscreenElement
    ) {
      return;
    }
    event.preventDefault();
    onClose?.();
  }

  return (
    <dialog
      aria-hidden={state === "closing" ? true : undefined}
      aria-label={
        playerTitle ? labels.videoPlayerTitle(playerTitle) : labels.videoPlayer
      }
      aria-modal="true"
      className="vibe-player-modal"
      data-state={state}
      inert={state === "closing" ? true : undefined}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      ref={setDialogRef}
    >
      <div
        aria-hidden
        className="vibe-player-modal__backdrop"
        style={backdropStyle}
      />
      <div className="vibe-player-modal__wash" />
      <div className="vibe-player-modal__gradient" />
      <div
        className="vibe-player-modal__panel"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div
          className="vibe-player-modal__frame"
          style={frameStyle}
          tabIndex={-1}
        >
          <VibePlayerShell
            footer={footer}
            header={header}
            title={source ? undefined : playerTitle}
          >
            {body}
          </VibePlayerShell>
        </div>
      </div>
    </dialog>
  );
}
