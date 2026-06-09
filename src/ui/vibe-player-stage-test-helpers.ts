import {
  createIdleCapabilities,
  createIdleSnapshot,
  type VibePlayerAdapter,
  type VibePlayerAdapterEvent,
  type VibePlayerCapabilities,
  type VibePlayerFileSource,
  type VibePlayerSnapshot,
  type VibePlayerSource,
} from "../core";

export const stageFileSource: VibePlayerFileSource = {
  id: "stage-video",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  title: "Stage demo",
  type: "file",
};

export interface StageAdapterFactoryHarness {
  adapterFactory: () => VibePlayerAdapter;
  adapters: TestStageAdapter[];
}

export interface StageAdapterFactoryOptions {
  configure?: (adapter: TestStageAdapter) => void;
}

export class TestStageAdapter implements VibePlayerAdapter {
  readonly calls: string[] = [];
  readonly capabilities: VibePlayerCapabilities = {
    ...createIdleCapabilities(),
    canFullscreen: true,
    canPictureInPicture: true,
    canSeek: true,
    canSetPlaybackRate: true,
    supportsDuration: true,
    supportsMute: true,
    supportsPlayback: true,
  };
  readonly kind = "file";
  loadError: Error | null = null;
  playError: Error | null = null;
  private listener: ((event: VibePlayerAdapterEvent) => void) | null = null;
  private snapshot: VibePlayerSnapshot = {
    ...createIdleSnapshot(),
    duration: 100,
    readyState: "ready",
  };

  enterFullscreen(): Promise<void> {
    this.calls.push("fullscreen");
    return Promise.resolve();
  }

  enterPictureInPicture(): Promise<void> {
    this.calls.push("pip");
    return Promise.resolve();
  }

  getSnapshot(): VibePlayerSnapshot {
    return this.snapshot;
  }

  setSnapshot(snapshot: VibePlayerSnapshot): void {
    this.snapshot = snapshot;
  }

  load(source: VibePlayerSource): Promise<void> {
    this.calls.push(`load:${source.id}`);
    if (this.loadError) {
      return Promise.reject(this.loadError);
    }
    return Promise.resolve();
  }

  mount(target: HTMLElement): Promise<void> {
    this.calls.push("mount");
    target.append(document.createElement("video"));
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this.calls.push("pause");
    this.snapshot = { ...this.snapshot, paused: true };
    this.listener?.({ snapshot: this.snapshot, type: "pause" });
    return Promise.resolve();
  }

  play(): Promise<void> {
    this.calls.push("play");
    if (this.playError) {
      return Promise.reject(this.playError);
    }
    this.snapshot = { ...this.snapshot, paused: false };
    this.listener?.({ snapshot: this.snapshot, type: "play" });
    return Promise.resolve();
  }

  seekTo(seconds: number): Promise<void> {
    this.calls.push(`seek:${seconds}`);
    this.snapshot = { ...this.snapshot, currentTime: seconds };
    return Promise.resolve();
  }

  setMuted(value: boolean): Promise<void> {
    this.calls.push(`muted:${String(value)}`);
    this.snapshot = { ...this.snapshot, muted: value };
    return Promise.resolve();
  }

  setPlaybackRate(value: number): Promise<void> {
    this.calls.push(`rate:${value}`);
    return Promise.resolve();
  }

  setVolume(value: number): Promise<void> {
    this.calls.push(`volume:${value}`);
    return Promise.resolve();
  }

  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  unmount(): Promise<void> {
    this.calls.push("unmount");
    return Promise.resolve();
  }
}

export function createBlockedPlaybackError(): Error {
  const error = new Error("Playback blocked");
  error.name = "NotAllowedError";
  return error;
}

export function createStageAdapterFactory(
  options: StageAdapterFactoryOptions = {}
): StageAdapterFactoryHarness {
  const adapters: TestStageAdapter[] = [];
  return {
    adapterFactory: () => {
      const adapter = new TestStageAdapter();
      options.configure?.(adapter);
      adapters.push(adapter);
      return adapter;
    },
    adapters,
  };
}

export function getStageAdapter(
  adapters: TestStageAdapter[]
): TestStageAdapter {
  const adapter = adapters[0];
  if (!adapter) {
    throw new Error("Missing stage test adapter.");
  }
  return adapter;
}

export function getStageMediaElement(container: HTMLElement): HTMLElement {
  const media = container.querySelector(".vibe-player-stage__media");
  if (!(media instanceof HTMLElement)) {
    throw new Error("Missing stage media element.");
  }
  return media;
}
