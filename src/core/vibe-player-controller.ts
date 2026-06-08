import { createIdleCapabilities, createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

type VibePlayerStateListener = (state: VibePlayerControllerState) => void;

function createInitialState(): VibePlayerControllerState {
  return {
    capabilities: null,
    currentSource: null,
    isMounted: false,
    lastEvent: null,
    snapshot: createIdleSnapshot(),
  };
}

export class VibePlayerController {
  private adapter: VibePlayerAdapter | null = null;
  private adapterUnsubscribe: (() => void) | null = null;
  private readonly adapterFactory: VibePlayerControllerOptions["adapterFactory"];
  private readonly listeners = new Set<VibePlayerStateListener>();
  private readonly onAnalyticsEvent:
    | ((event: VibePlayerAnalyticsEvent) => void)
    | undefined;
  private readonly resumeStore:
    | VibePlayerControllerOptions["resumeStore"]
    | undefined;
  private state = createInitialState();
  private target: HTMLElement | null = null;

  constructor(options: VibePlayerControllerOptions) {
    this.adapterFactory = options.adapterFactory;
    this.onAnalyticsEvent = options.onAnalyticsEvent;
    this.resumeStore = options.resumeStore;
  }

  getState(): VibePlayerControllerState {
    return this.state;
  }

  subscribe(listener: VibePlayerStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async mount(target: HTMLElement): Promise<void> {
    this.target = target;
    this.updateState({ isMounted: true });
    if (this.adapter) {
      await this.adapter.mount(target);
      this.syncFromAdapter();
    }
  }

  async unmount(): Promise<void> {
    this.target = null;
    if (this.adapter) {
      await this.adapter.unmount();
    }
    this.updateState({ isMounted: false });
  }

  async load(source: VibePlayerSource): Promise<void> {
    await this.teardownAdapter();

    const adapter = this.adapterFactory(source);
    this.adapter = adapter;
    this.adapterUnsubscribe = adapter.subscribe((event) =>
      this.handleAdapterEvent(event)
    );

    if (this.target) {
      await adapter.mount(this.target);
    }

    await adapter.load(source);
    this.updateState({
      capabilities: adapter.capabilities,
      currentSource: source,
      lastEvent: "ready",
      snapshot: adapter.getSnapshot(),
    });
    this.emitAnalytics({
      sourceId: source.id,
      provider: source.type,
      type: "opened",
    });
    await this.restoreResumePosition(source, adapter);
  }

  async play(): Promise<void> {
    await this.adapter?.play();
  }

  async pause(): Promise<void> {
    await this.adapter?.pause();
  }

  async seekTo(seconds: number): Promise<void> {
    if (!(this.adapter && this.state.currentSource)) {
      return;
    }
    await this.adapter.seekTo(seconds);
    this.resumeStore?.set(this.state.currentSource.id, seconds);
    this.emitAnalytics({
      currentTime: seconds,
      duration: this.state.snapshot.duration,
      provider: this.state.currentSource.type,
      sourceId: this.state.currentSource.id,
      type: "seek",
    });
  }

  async setMuted(value: boolean): Promise<void> {
    await this.adapter?.setMuted(value);
  }

  async setPlaybackRate(value: number): Promise<void> {
    await this.adapter?.setPlaybackRate(value);
  }

  async setVolume(value: number): Promise<void> {
    await this.adapter?.setVolume(value);
  }

  async teardown(): Promise<void> {
    await this.teardownAdapter();
    this.target = null;
    this.state = createInitialState();
    this.notify();
  }

  private emitAnalytics(event: VibePlayerAnalyticsEvent): void {
    this.onAnalyticsEvent?.(event);
  }

  private handleAdapterEvent(event: VibePlayerAdapterEvent): void {
    const source = this.state.currentSource;
    this.updateState({
      capabilities: this.adapter?.capabilities ?? createIdleCapabilities(),
      lastEvent: event.type,
      snapshot: event.snapshot,
    });

    if (!source) {
      return;
    }

    if (event.type === "timeupdate") {
      this.resumeStore?.set(source.id, event.snapshot.currentTime);
      return;
    }

    if (event.type === "play") {
      this.emitAnalytics({
        currentTime: event.snapshot.currentTime,
        duration: event.snapshot.duration,
        provider: source.type,
        sourceId: source.id,
        type: "started",
      });
      return;
    }

    if (event.type === "ended") {
      this.resumeStore?.clear(source.id);
      this.emitAnalytics({
        currentTime: event.snapshot.currentTime,
        duration: event.snapshot.duration,
        provider: source.type,
        sourceId: source.id,
        type: "completed",
      });
      return;
    }

    if (event.type === "error") {
      this.emitAnalytics({
        currentTime: event.snapshot.currentTime,
        duration: event.snapshot.duration,
        provider: source.type,
        sourceId: source.id,
        type: "error",
      });
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private async restoreResumePosition(
    source: VibePlayerSource,
    adapter: VibePlayerAdapter
  ): Promise<void> {
    const resumeTime = this.resumeStore?.get(source.id);
    if (!(resumeTime && resumeTime > 0 && adapter.capabilities.canSeek)) {
      return;
    }
    await adapter.seekTo(resumeTime);
    this.syncFromAdapter();
  }

  private syncFromAdapter(): void {
    if (!this.adapter) {
      return;
    }
    this.updateState({
      capabilities: this.adapter.capabilities,
      snapshot: this.adapter.getSnapshot(),
    });
  }

  private async teardownAdapter(): Promise<void> {
    this.adapterUnsubscribe?.();
    this.adapterUnsubscribe = null;

    if (this.adapter) {
      await this.adapter.unmount();
    }

    this.adapter = null;
  }

  private updateState(
    next: Partial<VibePlayerControllerState>
  ): VibePlayerControllerState {
    this.state = { ...this.state, ...next };
    this.notify();
    return this.state;
  }
}
