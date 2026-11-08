import type { CSSProperties, ReactNode, Ref } from "react";
import type {
  VibePlayerController,
  VibePlayerControllerState,
  VibePlayerSource,
} from "../core";
import type {
  UseVibePlayerOptions,
  VibePlayerCaptionStatus,
  VibePlayerCaptionTextLoader,
} from "../react";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import type { VibePlayerUIOptions } from "./vibe-player-ui-context";
import type { VibePlayerVariant } from "./vibe-player-ui-types";

/** Optional full-stage controls; capabilities still apply. */
export interface VibePlayerStageControls {
  /** Skip back/forward buttons around Play, labelled with `seekStep`. Default true. */
  skip?: boolean | undefined;
}

/** Touch gestures on the picture. */
export interface VibePlayerGestures {
  /**
   * Double-tap the left or right third to seek by `seekStep`; more taps add
   * up. Touch only: a mouse double-click keeps its meaning (full screen in the
   * full stage). Default true in the full stage, false in compact and feed.
   */
  doubleTapSeek?: boolean | undefined;
}

/** Playback options shared by full-stage, inline and modal assemblies. */
export interface VibePlayerPlaybackOptions
  extends Omit<UseVibePlayerOptions, "source" | "open" | "presentationTarget">,
    VibePlayerUIOptions {
  /** Inline players leave focus with the host; viewers may opt in. */
  autoFocus?: boolean | undefined;
  /** Keep controls visible when false; provider visibility requirements still apply. */
  autoHideControls?: boolean | undefined;
  className?: string | undefined;
  /** Host-controlled commands, including stop() at session boundaries. */
  controllerRef?: Ref<VibePlayerController> | undefined;
  controls?: VibePlayerStageControls | undefined;
  /**
   * Milliseconds without pointer activity before playing media hides its
   * controls. Defaults to 1500 for compact/feed and 2400 for full.
   */
  controlsHideDelay?: number | undefined;
  /**
   * How poster and video fill the clamped frame: `contain` (default)
   * letterboxes, `cover` crops. Fullscreen always letterboxes.
   */
  fit?: "contain" | "cover" | undefined;
  gestures?: VibePlayerGestures | undefined;
  /** Host caption loader; defaults to a cancellable fetch. */
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  maxRatio?: number | undefined;
  /** Source/metadata ratios are constrained to this interval. */
  minRatio?: number | undefined;
  /** Observe caption availability without treating it as a video failure. */
  onCaptionStatusChange?:
    | ((status: VibePlayerCaptionStatus) => void)
    | undefined;
  /** Observe normalized playback state without assembling a custom player. */
  onStateChange?: ((state: VibePlayerControllerState) => void) | undefined;
  /** Host-generated seek frames; changing this map does not reload playback. */
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
  style?: CSSProperties | undefined;
  /** Host actions rendered in the top control chrome. */
  topActions?: ReactNode;
  variant?: VibePlayerVariant | undefined;
}

/** Full package-owned player with optional host integrations. */
export interface VibePlayerStageProps extends VibePlayerPlaybackOptions {
  onClose?: (() => void) | undefined;
  open?: boolean | undefined;
  source: VibePlayerSource;
  title?: string | undefined;
}
