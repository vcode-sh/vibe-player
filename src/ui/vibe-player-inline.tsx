import type { PropsWithChildren, ReactNode } from "react";
import { createVibePlayerAdapter } from "../adapters";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "../core";
import type { VibePlayerCaptionTextLoader } from "../react";
import { VibePlayerShell } from "./vibe-player-shell";
import { VibePlayerStage } from "./vibe-player-stage";

export interface VibePlayerInlineProps extends PropsWithChildren {
  adapterFactory?: (source: VibePlayerSource) => VibePlayerAdapter;
  footer?: ReactNode;
  header?: ReactNode;
  loadCaptionText?: VibePlayerCaptionTextLoader;
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  resumeStore?: VibePlayerResumeStore;
  source?: VibePlayerSource | null;
  title?: string;
}

export function VibePlayerInline({
  adapterFactory = createVibePlayerAdapter,
  children,
  footer,
  header,
  loadCaptionText,
  onAnalyticsEvent,
  resumeStore,
  source = null,
  title,
}: VibePlayerInlineProps) {
  const playerTitle = title ?? source?.title;
  const playerBody = source ? (
    <VibePlayerStage
      adapterFactory={adapterFactory}
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
    <div className="vibe-player-inline">
      <VibePlayerShell footer={footer} header={header} title={playerTitle}>
        {playerBody}
      </VibePlayerShell>
    </div>
  );
}
