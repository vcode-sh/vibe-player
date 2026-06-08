import type { PropsWithChildren, ReactNode } from "react";
import { createVibePlayerAdapter } from "../adapters";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "../core";
import {
  useVibePlayerOverlayPresence,
  type VibePlayerCaptionTextLoader,
} from "../react";
import { VibePlayerShell } from "./vibe-player-shell";
import { VibePlayerStage } from "./vibe-player-stage";

export interface VibePlayerModalProps extends PropsWithChildren {
  adapterFactory?: (source: VibePlayerSource) => VibePlayerAdapter;
  footer?: ReactNode;
  header?: ReactNode;
  loadCaptionText?: VibePlayerCaptionTextLoader;
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  onClose?: () => void;
  open: boolean;
  resumeStore?: VibePlayerResumeStore;
  source?: VibePlayerSource | null;
  title?: string;
}

export function VibePlayerModal({
  adapterFactory = createVibePlayerAdapter,
  children,
  footer,
  header,
  loadCaptionText,
  onAnalyticsEvent,
  onClose,
  open,
  resumeStore,
  source = null,
  title,
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
      adapterFactory={adapterFactory}
      onClose={onClose}
      open={state === "open"}
      source={source}
      title={playerTitle}
      {...(loadCaptionText ? { loadCaptionText } : {})}
      {...(onAnalyticsEvent ? { onAnalyticsEvent } : {})}
      {...(resumeStore ? { resumeStore } : {})}
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
