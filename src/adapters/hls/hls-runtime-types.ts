import type Hls from "hls.js";
import type { HlsConfig } from "hls.js";
import type { VibePlayerErrorKind } from "../../core/vibe-player-types";
import type { ManagedHlsLevel } from "./hls-quality";

export interface HlsAdapterErrorPayload
  extends Record<string, boolean | number | string | undefined> {
  /** HTTP 401/403 is terminal for this URL even while the SDK would retry it. */
  credentialFailure?: boolean;
  details: string;
  fatal: boolean;
  /** hls.js just moved the playhead itself (a stall nudge or a gap skip). */
  internal?: boolean;
  /** HTTP 4xx and incompatible codecs are `source`; other failures by type. */
  kind?: VibePlayerErrorKind;
  message: string;
  network?: boolean;
  /**
   * What hls.js itself reported as `fatal`. With `fatal: false` it marks a
   * fatal media error the adapter is recovering (`recoverMediaError`).
   */
  sdkFatal?: boolean;
  status?: number;
  type: string;
}

/** Compatible with the full and light hls.js module entry points. */
export type HlsModuleLoader = () => Promise<{ default: typeof Hls }>;

/** Provider runtime and engine overrides; no SDK loads until source activation. */
export interface HlsAdapterOptions {
  hlsConfig?: Partial<HlsConfig> | undefined;
  hlsRuntime?: HlsAdapterRuntime | undefined;
  loadHls?: HlsModuleLoader | undefined;
}

export interface ManagedHlsSession {
  /** Async SDK imports must not attach to a disposed or replaced session. */
  isActive?: (() => boolean) | undefined;
  manifestUrl: string;
  onError: (payload: HlsAdapterErrorPayload) => void;
  onLevelLoaded: (isLive: boolean) => void;
  onLevelsChanged: (
    levels: ManagedHlsLevel[],
    selectedLevelIndex: number
  ) => void;
  /**
   * Called just before hls.js resets the media to recover a fatal media
   * error, which pauses it. The returned function runs once the engine has
   * attached the media again, for example to resume playback.
   */
  onMediaRecovery?: (() => (() => void) | undefined) | undefined;
  onReady: () => void;
  video: HTMLVideoElement;
}

export interface ManagedHlsController {
  destroy(): void;
  /**
   * Whether the media's seek to `time` is one the engine made itself, such
   * as a stall nudge, a gap skip or a live-edge catch-up. Optional: without
   * it every seek the adapter did not make counts as a media seek.
   */
  isInternalSeek?(time: number): boolean;
  setQualityLevel(levelIndex: number): void;
}

export interface HlsAdapterRuntime {
  attachManagedHls(
    session: ManagedHlsSession
  ): ManagedHlsController | Promise<ManagedHlsController>;
  canUseManagedHls(video?: HTMLVideoElement): boolean;
}
