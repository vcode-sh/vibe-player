import type Hls from "hls.js";
import type { HlsConfig } from "hls.js";
import type { HlsModuleLoader, ManagedHlsSession } from "./hls-runtime-types";

/** The parts of hls.js level details the adapter reads. */
export interface ProbeLevelDetails {
  edge?: number;
  fragmentStart?: number;
  live: boolean;
  targetduration?: number;
}

export class HlsEngineProbe {
  static readonly Events = {
    ERROR: "error",
    FRAG_LOADED: "fragLoaded",
    LEVEL_LOADED: "levelLoaded",
    LEVEL_SWITCHED: "levelSwitched",
    LEVELS_UPDATED: "levelsUpdated",
    MANIFEST_PARSED: "manifestParsed",
    MEDIA_ATTACHED: "mediaAttached",
  };
  static readonly instances: HlsEngineProbe[] = [];
  static isSupported = () => true;
  readonly config: Partial<HlsConfig>;
  readonly handlers = new Map<string, (event: string, data: unknown) => void>();
  bandwidthEstimate = 2_750_000;
  destroyed = false;
  latestLevelDetails: ProbeLevelDetails | null = null;
  levels = [];
  liveSyncPosition: number | null = null;
  loadedUrl = "";
  readonly loadedUrls: string[] = [];
  /** Models the media reset hls.js performs while it recovers. */
  mediaReset: (() => void) | null = null;
  manualLevel = -1;
  nextLevel = -1;
  /** Media recovery calls, in order. */
  readonly recoveries: string[] = [];
  startedAt: number | undefined;
  startPosition = -1;
  stopped = false;
  video: HTMLVideoElement | null = null;

  constructor(config: Partial<HlsConfig>) {
    this.config = config;
    HlsEngineProbe.instances.push(this);
  }

  attachMedia(video: HTMLVideoElement): void {
    this.video = video;
  }
  destroy(): void {
    this.destroyed = true;
  }
  recoverMediaError(): void {
    this.recoveries.push("recoverMediaError");
    this.mediaReset?.();
  }
  swapAudioCodec(): void {
    this.recoveries.push("swapAudioCodec");
  }
  loadSource(url: string): void {
    this.loadedUrl = url;
    this.loadedUrls.push(url);
  }
  startLoad(seconds: number): void {
    this.startedAt = seconds;
  }
  stopLoad(): void {
    this.stopped = true;
  }
  on(event: string, handler: (event: string, data: unknown) => void): void {
    this.handlers.set(event, handler);
  }
  emit(event: string, data: unknown = {}): void {
    this.handlers.get(event)?.(event, data);
  }
}

/** Only the SDK boundary is fake; production runtime owns all decisions. */
export const loadProbeHls: HlsModuleLoader = () =>
  Promise.resolve({
    default: HlsEngineProbe as unknown as typeof Hls,
  });

export function createProbeHlsSession(): ManagedHlsSession {
  return {
    manifestUrl: "https://example.com/private/master.m3u8",
    onError: () => undefined,
    onLevelLoaded: () => undefined,
    onLevelsChanged: () => undefined,
    onReady: () => undefined,
    video: document.createElement("video"),
  };
}

export function getLatestHlsEngine(): HlsEngineProbe {
  const engine = HlsEngineProbe.instances.at(-1);
  if (!engine) {
    throw new Error("The runtime did not construct an HLS engine.");
  }
  return engine;
}
