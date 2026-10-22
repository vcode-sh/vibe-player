import type { ManagedHlsLevel } from "./hls-quality";

export interface HlsAdapterErrorPayload
  extends Record<string, boolean | string> {
  details: string;
  fatal: boolean;
  message: string;
  type: string;
}

export interface ManagedHlsSession {
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
  canUseManagedHls(): boolean;
}
