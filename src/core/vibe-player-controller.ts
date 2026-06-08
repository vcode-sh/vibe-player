import { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { handleVibePlayerAdapterEvent } from "./vibe-player-controller-events";
import { createInitialControllerState } from "./vibe-player-controller-state";
import { isVibePlayerPlaybackBlockedError } from "./vibe-player-errors";
import { createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

type VibePlayerStateListener = (state: VibePlayerControllerState) => void;

export class VibePlayerController {
  private adapter: VibePlayerAdapter | null = null;
  private adapterUnsubscribe: (() => void) | null = null;
  private readonly adapterFactory: VibePlayerControllerOptions["adapterFactory"];
  private readonly analyticsSession: VibePlayerAnalyticsSession;
  private readonly listeners = new Set<VibePlayerStateListener>();
  private readonly onAnalyticsEvent:
    | ((event: VibePlayerAnalyticsEvent) => void)
    | undefined;
  private readonly resumeStore:
    | VibePlayerControllerOptions["resumeStore"]
    | undefined;
  private operationGeneration = 0;
  private state = createInitialControllerState();
  private target: HTMLElement | null = null;

  constructor(options: VibePlayerControllerOptions) {
    this.adapterFactory = options.adapterFactory;
    this.onAnalyticsEvent = options.onAnalyticsEvent;
    this.resumeStore = options.resumeStore;
    this.analyticsSession = new VibePlayerAnalyticsSession((event) =>
      this.emitAnalytics(event)
    );
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
    const targetChanged = this.target !== target || !this.state.isMounted;
    this.target = target;
    if (targetChanged) {
      this.updateState({ isMounted: true });
    }
    if (this.adapter) {
      await this.adapter.mount(target);
      if (targetChanged) {
        this.syncFromAdapter();
      }
    }
  }
  async unmount(): Promise<void> {
    this.operationGeneration += 1;
    this.target = null;
    if (this.adapter) {
      await this.adapter.unmount();
    }
    this.updateState({ isMounted: false });
  }
  async load(source: VibePlayerSource): Promise<void> {
    this.operationGeneration += 1;
    const operationGeneration = this.operationGeneration;
    this.analyticsSession.close(this.state);
    await this.teardownAdapter();
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.analyticsSession.clear();
    const adapter = this.adapterFactory(source);
    this.adapter = adapter;
    this.adapterUnsubscribe = adapter.subscribe((event) =>
      this.handleAdapterEvent(event)
    );
    if (this.target) {
      await adapter.mount(this.target);
    }
    if (!this.isCurrentOperation(operationGeneration)) {
      await adapter.unmount();
      return;
    }
    await adapter.load(source);
    if (!this.isCurrentOperation(operationGeneration)) {
      await adapter.unmount();
      return;
    }
    this.updateState({
      capabilities: adapter.capabilities,
      currentSource: source,
      lastEvent: "ready",
      playbackBlocked: false,
      snapshot: adapter.getSnapshot(),
    });
    this.analyticsSession.emitOnce({
      sourceId: source.id,
      provider: source.type,
      type: "opened",
    });
    await this.restoreResumePosition(source, adapter, operationGeneration);
  }
  async closeSource(): Promise<void> {
    this.operationGeneration += 1;
    this.analyticsSession.close(this.state);
    await this.teardownAdapter();
    this.analyticsSession.clear();
    this.updateState({
      capabilities: null,
      currentSource: null,
      lastEvent: null,
      playbackBlocked: false,
      snapshot: createIdleSnapshot(),
    });
  }
  async play(): Promise<void> {
    try {
      await this.adapter?.play();
    } catch (error) {
      if (isVibePlayerPlaybackBlockedError(error)) {
        this.updateState({ lastEvent: "playblocked", playbackBlocked: true });
        return;
      }
      throw error;
    }
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
  async enterFullscreen(): Promise<void> {
    await this.adapter?.enterFullscreen?.();
  }
  async exitFullscreen(): Promise<void> {
    await this.adapter?.exitFullscreen?.();
  }
  async enterPictureInPicture(): Promise<void> {
    await this.adapter?.enterPictureInPicture?.();
  }
  async teardown(): Promise<void> {
    this.operationGeneration += 1;
    this.analyticsSession.close(this.state);
    await this.teardownAdapter();
    this.analyticsSession.clear();
    this.target = null;
    this.state = createInitialControllerState();
    this.notify();
  }
  private emitAnalytics(event: VibePlayerAnalyticsEvent): void {
    this.onAnalyticsEvent?.(event);
  }
  private handleAdapterEvent(event: VibePlayerAdapterEvent): void {
    handleVibePlayerAdapterEvent({
      adapter: this.adapter,
      analyticsSession: this.analyticsSession,
      currentSource: this.state.currentSource,
      emitAnalytics: (analyticsEvent) => this.emitAnalytics(analyticsEvent),
      event,
      playbackBlocked: this.state.playbackBlocked,
      resumeStore: this.resumeStore,
      updateState: (next) => this.updateState(next),
    });
  }
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
  private async restoreResumePosition(
    source: VibePlayerSource,
    adapter: VibePlayerAdapter,
    operationGeneration: number
  ): Promise<void> {
    const resumeTime = this.resumeStore?.get(source.id);
    if (
      !(
        resumeTime &&
        resumeTime > 0 &&
        adapter.capabilities.canSeek &&
        this.isCurrentOperation(operationGeneration)
      )
    ) {
      return;
    }
    await adapter.seekTo(resumeTime);
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
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

  private isCurrentOperation(operationGeneration: number): boolean {
    return this.operationGeneration === operationGeneration;
  }
}
