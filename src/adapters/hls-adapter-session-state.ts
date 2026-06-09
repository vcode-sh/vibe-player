import type { VibePlayerHlsSource } from "../core/vibe-player-types";
import type { HlsAdapterLoadSession } from "./hls-adapter-load-session";

export interface HlsAdapterSessionState {
  beginLoad: (source: VibePlayerHlsSource) => HlsAdapterLoadSession;
  close: () => void;
  incrementPlaybackGeneration: () => number;
  isCurrentLoadSession: (loadSession: HlsAdapterLoadSession) => boolean;
  readonly isSeekable: boolean;
  readonly live: boolean;
  markMounted: () => void;
  readonly mounted: boolean;
  readonly playbackGeneration: number;
  setLive: (isLive: boolean) => void;
  readonly source: VibePlayerHlsSource | null;
}

export function createHlsAdapterSessionState(): HlsAdapterSessionState {
  return new MutableHlsAdapterSessionState();
}

class MutableHlsAdapterSessionState implements HlsAdapterSessionState {
  private currentLoadGeneration = 0;
  private currentPlaybackGeneration = 0;
  private currentSource: VibePlayerHlsSource | null = null;
  private mountedState = false;
  private liveState = false;

  get isSeekable(): boolean {
    return !this.liveState;
  }

  get live(): boolean {
    return this.liveState;
  }

  get mounted(): boolean {
    return this.mountedState;
  }

  get playbackGeneration(): number {
    return this.currentPlaybackGeneration;
  }

  get source(): VibePlayerHlsSource | null {
    return this.currentSource;
  }

  beginLoad(source: VibePlayerHlsSource): HlsAdapterLoadSession {
    this.currentSource = source;
    this.currentLoadGeneration += 1;
    this.currentPlaybackGeneration += 1;
    this.liveState = Boolean(source.live);
    return { generation: this.currentLoadGeneration };
  }

  close(): void {
    this.mountedState = false;
    this.currentLoadGeneration += 1;
    this.currentPlaybackGeneration += 1;
    this.currentSource = null;
    this.liveState = false;
  }

  incrementPlaybackGeneration(): number {
    this.currentPlaybackGeneration += 1;
    return this.currentPlaybackGeneration;
  }

  isCurrentLoadSession(loadSession: HlsAdapterLoadSession): boolean {
    return this.currentLoadGeneration === loadSession.generation;
  }

  markMounted(): void {
    this.mountedState = true;
  }

  setLive(isLive: boolean): void {
    this.liveState = isLive;
  }
}
