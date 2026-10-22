import type { PropsWithChildren, ReactNode } from "react";
import type { VibePlayerSource } from "../core";
import { useVibePlayerOverlayPresence } from "../react";
import { VibePlayerShell } from "./vibe-player-shell";
import { VibePlayerStage } from "./vibe-player-stage";
import type { VibePlayerPlaybackOptions } from "./vibe-player-stage-types";

export interface VibePlayerModalProps
  extends PropsWithChildren,
    VibePlayerPlaybackOptions {
  footer?: ReactNode;
  header?: ReactNode;
  onClose?: () => void;
  open: boolean;
  source?: VibePlayerSource | null;
  title?: string;
}

export function VibePlayerModal({
  children,
  footer,
  header,
  onClose,
  open,
  source = null,
  title,
  ...playback
}: VibePlayerModalProps) {
  const { rendered, state } = useVibePlayerOverlayPresence(open);
  if (!rendered) {
    return null;
  }

  const playerTitle = title ?? source?.title;
  const backdropStyle = source?.posterUrl
    ? { backgroundImage: `url("${source.posterUrl}")` }
    : undefined;
  const body = source ? (
    <VibePlayerStage
      {...playback}
      onClose={onClose}
      open={state === "open"}
      source={source}
      title={playerTitle}
    />
  ) : (
    children
  );

  return (
    <div
      aria-hidden={state === "closing" ? true : undefined}
      aria-label={playerTitle ? `${playerTitle} video player` : "Video player"}
      aria-modal="true"
      className="vibe-player-modal"
      data-state={state}
      inert={state === "closing" ? true : undefined}
      role="dialog"
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
        <div className="vibe-player-modal__frame">
          <VibePlayerShell footer={footer} header={header} title={playerTitle}>
            {body}
          </VibePlayerShell>
        </div>
      </div>
    </div>
  );
}
