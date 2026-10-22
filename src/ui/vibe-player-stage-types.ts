import type { ReactNode } from "react";
import type { VibePlayerControllerState, VibePlayerSource } from "../core";
import type {
  UseVibePlayerOptions,
  VibePlayerCaptionStatus,
  VibePlayerCaptionTextLoader,
} from "../react";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

/** Playback options shared by full-stage, inline and modal assemblies. */
export interface VibePlayerPlaybackOptions
  extends Omit<UseVibePlayerOptions, "source" | "open" | "presentationTarget"> {
  /** Keep controls visible when false; provider visibility requirements still apply. */
  autoHideControls?: boolean | undefined;
  /** Host caption loader; defaults to a cancellable fetch. */
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  /** Observe caption availability without treating it as a video failure. */
  onCaptionStatusChange?:
    | ((status: VibePlayerCaptionStatus) => void)
    | undefined;
  /** Observe normalized playback state without assembling a custom player. */
  onStateChange?: ((state: VibePlayerControllerState) => void) | undefined;
  /** Host-generated seek frames; changing this map does not reload playback. */
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
  /** Host actions rendered in the top control chrome. */
  topActions?: ReactNode;
}

/** Full package-owned player with optional host integrations. */
export interface VibePlayerStageProps extends VibePlayerPlaybackOptions {
  onClose?: (() => void) | undefined;
  open?: boolean | undefined;
  source: VibePlayerSource;
  title?: string | undefined;
}
