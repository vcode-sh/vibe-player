import { VibePlayerController } from "./vibe-player-controller";
import { createIdleCapabilities, createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerEventName,
  VibePlayerFileSource,
  VibePlayerSnapshot,
} from "./vibe-player-types";

export const fileSource: VibePlayerFileSource = {
  id: "video-1",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  type: "file",
};

export interface ControllerHarness {
  adapters: TestAdapter[];
  analytics: VibePlayerAnalyticsEvent[];
  controller: VibePlayerController;
  resumeCalls: string[];
}

export class TestAdapter implements VibePlayerAdapter {
  readonly calls: string[] = [];
  readonly capabilities = {
    ...createIdleCapabilities(),
    canSeek: true,
    supportsPlayback: true,
  };
  readonly kind: VibePlayerAdapter["kind"] = "file";
  emitReadyDuringLoad = false;
  loadError: Error | null = null;
  playError: Error | null = null;
  private listener: ((event: VibePlayerAdapterEvent) => void) | null = null;
  private snapshot = createIdleSnapshot();

  emit(type: VibePlayerEventName, patch: Partial<VibePlayerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listener?.({ snapshot: this.snapshot, type });
  }

  getSnapshot(): VibePlayerSnapshot {
    return this.snapshot;
  }

  load(source: VibePlayerFileSource): Promise<void> {
    this.calls.push(`load:${source.id}`);
    if (this.loadError) {
      return Promise.reject(this.loadError);
    }
    this.snapshot = { ...this.snapshot, duration: 100, readyState: "ready" };
    if (this.emitReadyDuringLoad) {
      this.listener?.({ snapshot: this.snapshot, type: "ready" });
    }
    return Promise.resolve();
  }

  mount(target: HTMLElement): Promise<void> {
    this.calls.push(`mount:${target.tagName.toLowerCase()}`);
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this.calls.push("pause");
    return Promise.resolve();
  }

  play(): Promise<void> {
    this.calls.push("play");
    if (this.playError) {
      return Promise.reject(this.playError);
    }
    return Promise.resolve();
  }

  seekTo(seconds: number): Promise<void> {
    this.calls.push(`seek:${seconds}`);
    this.snapshot = { ...this.snapshot, currentTime: seconds };
    return Promise.resolve();
  }

  setMuted(value: boolean): Promise<void> {
    this.calls.push(`muted:${String(value)}`);
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

export function createControllerHarness(
  resumeAt: number | null = null
): ControllerHarness {
  const adapters: TestAdapter[] = [];
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const resumeCalls: string[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => {
      const adapter = new TestAdapter();
      adapters.push(adapter);
      return adapter;
    },
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
    resumeStore: {
      clear(sourceId: string) {
        resumeCalls.push(`clear:${sourceId}`);
      },
      get(sourceId: string) {
        resumeCalls.push(`get:${sourceId}`);
        return resumeAt;
      },
      set(sourceId: string, seconds: number) {
        resumeCalls.push(`set:${sourceId}:${seconds}`);
      },
    },
  });
  return { adapters, analytics, controller, resumeCalls };
}

export function createControllerWithAdapter(adapter: TestAdapter): {
  analytics: VibePlayerAnalyticsEvent[];
  controller: VibePlayerController;
} {
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
  });
  return { analytics, controller };
}

export function getAdapter(
  adapters: TestAdapter[],
  index: number
): TestAdapter {
  const adapter = adapters[index];
  if (!adapter) {
    throw new Error(`Missing test adapter at index ${index}`);
  }
  return adapter;
}
