"use client";

export type {
  HlsAdapterOptions,
  HlsAdapterRuntime,
  HlsModuleLoader,
  VibePlayerAdapterOptions,
} from "./adapters";
export {
  createLocalStorageVibePlayerResumeStore,
  createMemoryVibePlayerResumeStore,
  formatVibePlayerTime,
  type VibePlayerCommandErrorEvent,
  VibePlayerController,
  type VibePlayerControllerOptions,
  type VibePlayerControllerState,
  type VibePlayerError,
  type VibePlayerErrorKind,
  type VibePlayerEvent,
  type VibePlayerEventOfType,
  type VibePlayerEventType,
  type VibePlayerHlsManifestSource,
  type VibePlayerHlsSource,
  type VibePlayerHlsUrlSource,
  type VibePlayerIntegrationEvent,
  type VibePlayerLoadMode,
  type VibePlayerMp4Source,
  type VibePlayerPlaybackEvent,
  type VibePlayerRenewEvent,
  type VibePlayerResumeContext,
  type VibePlayerResumeStore,
  type VibePlayerSnapshot,
  type VibePlayerSource,
  type VibePlayerSourceMetadata,
  type VibePlayerStopEvent,
  type VibePlayerWatchedRange,
  type VibePlayerWatchedRangesReason,
  type VibePlayerWatchedRangesReport,
} from "./core";
export {
  createVibePlayerAudioFocusParticipant,
  getVibePlayerAudioFocusOwner,
  subscribeVibePlayerAudioFocus,
  type VibePlayerAudioFocusParticipant,
  type VibePlayerAudioFocusParticipantOptions,
} from "./core/vibe-player-audio-focus";
export {
  getVibePlayerControllers,
  subscribeVibePlayerControllers,
} from "./core/vibe-player-controller-registry";
export type {
  VibePlayerMediaSessionArtwork,
  VibePlayerMediaSessionMetadata,
  VibePlayerMediaSessionOptions,
} from "./core/vibe-player-media-session-types";
export {
  type UseVibePlayerOptions,
  useVibePlayer,
} from "./react/use-vibe-player";
export type {
  VibePlayerAudioFocusOptions,
  VibePlayerAudioFocusSetting,
} from "./react/use-vibe-player-audible-focus";
export {
  type UseVibePlayerAudioFocusOptions,
  useVibePlayerAudioFocus,
  type VibePlayerAudioFocusBinding,
} from "./react/use-vibe-player-audio-focus";
export {
  type UseVibePlayerControllerOptions,
  useVibePlayerController,
} from "./react/use-vibe-player-controller";
export type { UseVibePlayerMediaSessionOptions } from "./react/use-vibe-player-media-session";
export type { VibePlayerVisibilityOptions } from "./react/use-vibe-player-visibility";
