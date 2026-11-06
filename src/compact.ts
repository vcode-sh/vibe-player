"use client";

export type {
  VibePlayerCommandErrorEvent,
  VibePlayerController,
  VibePlayerControllerState,
  VibePlayerError,
  VibePlayerEvent,
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
  VibePlayerScrubber,
  type VibePlayerScrubberProps,
} from "./ui/vibe-player-scrubber";
export type {
  VibePlayerCompactControls,
  VibePlayerCompactSkin,
  VibePlayerCompactSlots,
  VibePlayerSurface,
  VibePlayerSurfaceActions,
  VibePlayerSurfacePhase,
  VibePlayerSurfaceState,
} from "./ui/vibe-player-surface-types";
export type { VibePlayerUIOptions } from "./ui/vibe-player-ui-context";
export type {
  VibePlayerClassNames,
  VibePlayerIconProps,
  VibePlayerIcons,
  VibePlayerLabels,
  VibePlayerVariant,
} from "./ui/vibe-player-ui-types";
