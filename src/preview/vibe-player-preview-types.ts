import type { ReactNode } from "react";

export interface VibePlayerAmbientPreviewSource {
  fallbackPosterUrl?: string | undefined;
  id?: string | undefined;
  posterUrl: string;
  previewVideoUrl?: string | undefined;
}

export interface VibePlayerBackgroundPreviewProps {
  paused?: boolean | undefined;
  preservePreviousLayer?: boolean | undefined;
  source: VibePlayerAmbientPreviewSource;
}

export interface VibePlayerAmbientPreviewProps
  extends VibePlayerBackgroundPreviewProps {
  activateLabel?: string | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  onActivate?: (() => void) | undefined;
  title?: string | undefined;
}

export interface VibePlayerBackgroundLayerSnapshot {
  fallbackPosterUrl?: string | undefined;
  id: string;
  posterUrl: string;
  previewVideoUrl?: string | undefined;
}

export interface VibePlayerBackgroundLayerState
  extends VibePlayerBackgroundLayerSnapshot {
  visible: boolean;
}
