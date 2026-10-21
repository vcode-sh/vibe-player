import { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import {
  handleVibePlayerControllerPause,
  handleVibePlayerControllerPlay,
  handleVibePlayerControllerSeek,
} from "./vibe-player-controller-commands";
import { handleVibePlayerAdapterEvent } from "./vibe-player-controller-events";
import { loadVibePlayerControllerSource } from "./vibe-player-controller-load";
import { createInitialControllerState } from "./vibe-player-controller-state";
import { createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
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
  private readonly onAnalyticsEvent: VibePlayerControllerOptions["onAnalyticsEvent"];
  private readonly resumeStore: VibePlayerControllerOptions["resumeStore"];
  private operationGeneration = 0;
  private playbackCommandGeneration = 0;
  private state = createInitialControllerState();
  private target: HTMLElement | null = null;
  constructor(options: VibePlayerControllerOptions) {
    this.adapterFactory = options.adapterFactory;
    this.onAnalyticsEvent = options.onAnalyticsEvent;
    this.resumeStore = options.resumeStore;
    this.analyticsSession = new VibePlayerAnalyticsSession((event) =>
      this.onAnalyticsEvent?.(event)
    );
  }
  getState(): VibePlayerControllerState {
    return this.state;
  }
  subscribe(listener: VibePlayerStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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
    const { operationGeneration } = this;
    this.target = null;
    await this.adapter?.unmount();
    if (this.isCurrentOperation(operationGeneration) && this.target === null) {
      this.updateState({ isMounted: false });
    }
  }
  async load(source: VibePlayerSource): Promise<void> {
    this.operationGeneration += 1;
    await loadVibePlayerControllerSource({
      adapterFactory: this.adapterFactory,
      analyticsSession: this.analyticsSession,
      currentState: this.state,
      emitAnalytics: (event) => this.onAnalyticsEvent?.(event),
      handleAdapterEvent: (event) => this.handleAdapterEvent(event),
      isCurrentOperation: (generation) => this.isCurrentOperation(generation),
      operationGeneration: this.operationGeneration,
      resumeStore: this.resumeStore,
      setAdapter: (adapter) => {
        this.adapter = adapter;
      },
      setAdapterUnsubscribe: (unsubscribe) => {
        this.adapterUnsubscribe = unsubscribe;
      },
      source,
      syncFromAdapter: () => this.syncFromAdapter(),
      target: this.target,
      teardownAdapter: () => this.teardownAdapter(),
      updateState: (next) => this.updateState(next),
    });
  }
  async closeSource(): Promise<void> {
    this.operationGeneration += 1;
    const { operationGeneration } = this;
    this.analyticsSession.close(this.state);
    await this.teardownAdapter();
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
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
    this.playbackCommandGeneration += 1;
    const { operationGeneration, playbackCommandGeneration } = this;
    await handleVibePlayerControllerPlay({
      adapter: this.adapter,
      updateState: (next) => {
        if (
          this.isCurrentOperation(operationGeneration) &&
          this.playbackCommandGeneration === playbackCommandGeneration
        ) {
          this.updateState(next);
        }
      },
    });
  }
  async pause(): Promise<void> {
    this.playbackCommandGeneration += 1;
    const { operationGeneration, playbackCommandGeneration } = this;
    await handleVibePlayerControllerPause({
      adapter: this.adapter,
      updateState: (next) => {
        if (
          this.isCurrentOperation(operationGeneration) &&
          this.playbackCommandGeneration === playbackCommandGeneration
        ) {
          this.updateState(next);
        }
      },
    });
  }
  async seekTo(seconds: number): Promise<void> {
    await handleVibePlayerControllerSeek({
      adapter: this.adapter,
      currentSource: this.state.currentSource,
      duration: this.state.snapshot.duration,
      emitAnalytics: (event) => this.onAnalyticsEvent?.(event),
      resumeStore: this.resumeStore,
      seconds,
    });
  }
  async setMuted(value: boolean): Promise<void> {
    await this.adapter?.setMuted(value);
  }
  async setPlaybackRate(value: number): Promise<void> {
    await this.adapter?.setPlaybackRate(value);
  }
  async setQuality(qualityId: string): Promise<void> {
    await this.adapter?.setQuality?.(qualityId);
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
    const { operationGeneration } = this;
    this.analyticsSession.close(this.state);
    await this.teardownAdapter();
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.analyticsSession.clear();
    this.target = null;
    this.state = createInitialControllerState();
    this.notify();
  }
  private handleAdapterEvent(event: VibePlayerAdapterEvent): void {
    handleVibePlayerAdapterEvent({
      adapter: this.adapter,
      analyticsSession: this.analyticsSession,
      currentSnapshot: this.state.snapshot,
      currentSource: this.state.currentSource,
      emitAnalytics: (analyticsEvent) =>
        this.onAnalyticsEvent?.(analyticsEvent),
      event,
      lastEvent: this.state.lastEvent,
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
    const { adapter } = this;
    this.adapter = null;
    await adapter?.unmount();
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
