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
  /** HTTP 4xx and incompatible codecs are `source`; other failures by type. */
  kind?: VibePlayerErrorKind;
  message: string;
  network?: boolean;
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
  onReady: () => void;
  video: HTMLVideoElement;
}

export interface ManagedHlsController {
  destroy(): void;
  setQualityLevel(levelIndex: number): void;
}

export interface HlsAdapterRuntime {
  attachManagedHls(
    session: ManagedHlsSession
  ): ManagedHlsController | Promise<ManagedHlsController>;
  canUseManagedHls(video?: HTMLVideoElement): boolean;
}
