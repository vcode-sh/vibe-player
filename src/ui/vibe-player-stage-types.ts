import type { ReactNode } from "react";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "../core";
import type { VibePlayerCaptionTextLoader } from "../react";

/** Props for the full package-owned player stage. */
export interface VibePlayerStageProps {
  /** Optional adapter factory for tests or host-provided provider overrides. */
  adapterFactory?:
    | ((source: VibePlayerSource) => VibePlayerAdapter)
    | undefined;
  /** Starts playback after the selected source loads. */
  autoPlay?: boolean;
  /** Temporarily mutes during autoplay bootstrap to satisfy browser policy. */
  autoPlayMutedBootstrap?: boolean;
  /** Host-provided caption text loader; defaults to `fetch`. */
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  /** Normalized package analytics sink owned by the consuming app. */
  onAnalyticsEvent?: ((event: VibePlayerAnalyticsEvent) => void) | undefined;
  /** Optional close action rendered by the package controls. */
  onClose?: (() => void) | undefined;
  /** Controls whether the active media source should stay mounted. */
  open?: boolean;
  /** Optional host persistence adapter for resume playback. */
  resumeStore?: VibePlayerResumeStore | undefined;
  /** Provider-agnostic source loaded by the package stage. */
  source: VibePlayerSource;
  /** Display title override; falls back to `source.title`. */
  title?: string | undefined;
  /** Host-owned actions rendered in the top control chrome. */
  topActions?: ReactNode;
}
