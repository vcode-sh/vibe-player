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
