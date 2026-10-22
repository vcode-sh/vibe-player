import type { ReactNode } from "react";
import type { VibePlayerControllerState, VibePlayerSource } from "../core";
import type {
  UseVibePlayerOptions,
  VibePlayerCaptionTextLoader,
} from "../react";

/** Playback options shared by full-stage, inline and modal assemblies. */
export interface VibePlayerPlaybackOptions
  extends Omit<UseVibePlayerOptions, "source" | "open"> {
  /** Keep controls visible when false; provider visibility requirements still apply. */
  autoHideControls?: boolean | undefined;
  /** Host caption loader; defaults to a cancellable fetch. */
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  /** Observe normalized playback state without assembling a custom player. */
  onStateChange?: ((state: VibePlayerControllerState) => void) | undefined;
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
