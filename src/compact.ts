"use client";

export type {
  VibePlayerCommandErrorEvent,
  VibePlayerController,
  VibePlayerControllerState,
  VibePlayerError,
  VibePlayerErrorKind,
  VibePlayerEvent,
  VibePlayerEventOfType,
  VibePlayerEventType,
  VibePlayerHlsSource,
  VibePlayerLoadMode,
  VibePlayerMp4Source,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./core";

export {
  VibePlayerCompact,
  type VibePlayerCompactProps,
} from "./ui/vibe-player-compact";
export {
  VibePlayerHeadless,
  type VibePlayerHeadlessProps,
  type VibePlayerHeadlessVideoProps,
} from "./ui/vibe-player-headless";
export {
  VibePlayerHeatmap,
  type VibePlayerHeatmapProps,
} from "./ui/vibe-player-heatmap";
export {
  VibePlayerHostFrame,
  type VibePlayerHostFrameProps,
} from "./ui/vibe-player-host-frame";
export {
  VibePlayerScrubber,
  type VibePlayerScrubberProps,
} from "./ui/vibe-player-scrubber";
export {
  createVibePlayerSeekThumbnails,
  parseVibePlayerSeekThumbnailsVtt,
  type VibePlayerSeekThumbnailGrid,
} from "./ui/vibe-player-seek-thumbnail-sources";
export type {
  VibePlayerSeekThumbnail,
  VibePlayerSeekThumbnailSprite,
} from "./ui/vibe-player-seek-thumbnail-types";
export type { VibePlayerGestures } from "./ui/vibe-player-stage-types";
export type {
  VibePlayerCompactControls,
  VibePlayerCompactSkin,
  VibePlayerCompactSlots,
  VibePlayerSurface,
  VibePlayerSurfaceActions,
  VibePlayerSurfacePhase,
  VibePlayerSurfaceState,
} from "./ui/vibe-player-surface-types";
export type { VibePlayerTimelinePreview } from "./ui/vibe-player-timeline-preview";
export type {
  VibePlayerTimelineBackground,
  VibePlayerTimelineBackgroundContext,
  VibePlayerUIOptions,
} from "./ui/vibe-player-ui-context";
export type {
  VibePlayerClassNames,
  VibePlayerIconProps,
  VibePlayerIcons,
  VibePlayerLabels,
  VibePlayerVariant,
} from "./ui/vibe-player-ui-types";
