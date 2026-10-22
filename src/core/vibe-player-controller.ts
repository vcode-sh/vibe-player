import { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { runVibePlayerControllerCommand } from "./vibe-player-controller-command-error";
import {
  handleVibePlayerControllerPause,
  handleVibePlayerControllerPlay,
  handleVibePlayerControllerSeek,
} from "./vibe-player-controller-commands";
import { handleVibePlayerAdapterEvent } from "./vibe-player-controller-events";
import { loadVibePlayerControllerSource } from "./vibe-player-controller-load";
import { mountVibePlayerControllerAdapter } from "./vibe-player-controller-mount";
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
  private readonly onError: VibePlayerControllerOptions["onError"];
  private readonly resumeStore: VibePlayerControllerOptions["resumeStore"];
  private operationGeneration = 0;
  private playbackCommandGeneration = 0;
  private state = createInitialControllerState();
  private target: HTMLElement | null = null;
  constructor(options: VibePlayerControllerOptions) {
    this.adapterFactory = options.adapterFactory;
    this.onAnalyticsEvent = options.onAnalyticsEvent;
    this.onError = options.onError;
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
    const { adapter, operationGeneration } = this;
    await mountVibePlayerControllerAdapter({
      adapter,
      emitAnalytics: (event) => this.onAnalyticsEvent?.(event),
      isCurrent: () =>
        this.isCurrentOperation(operationGeneration) &&
        this.adapter === adapter &&
        this.target === target,
      source: this.state.currentSource,
      target,
      targetChanged,
      updateState: (next) => this.updateState(next),
    });
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
      error: null,
      lastEvent: null,
      playbackBlocked: false,
      snapshot: createIdleSnapshot(),
    });
  }
  play(): Promise<void> {
    return this.runPlaybackCommand("play");
  }
  pause(): Promise<void> {
    return this.runPlaybackCommand("pause");
  }
  seekTo(seconds: number): Promise<void> {
    return this.runCommand("seekTo", () =>
      handleVibePlayerControllerSeek({
        adapter: this.adapter,
        currentSource: this.state.currentSource,
        duration: this.state.snapshot.duration,
        emitAnalytics: (event) => this.onAnalyticsEvent?.(event),
        resumeStore: this.resumeStore,
        seconds,
      })
    );
  }
  setMuted(value: boolean): Promise<void> {
    return this.runCommand("setMuted", () => this.adapter?.setMuted(value));
  }
  setPlaybackRate(value: number): Promise<void> {
    return this.runCommand("setPlaybackRate", () =>
      this.adapter?.setPlaybackRate(value)
    );
  }
  setQuality(qualityId: string): Promise<void> {
    return this.runCommand("setQuality", () =>
      this.adapter?.setQuality?.(qualityId)
    );
  }
  setVolume(value: number): Promise<void> {
    return this.runCommand("setVolume", () => this.adapter?.setVolume(value));
  }
  enterFullscreen(): Promise<void> {
    return this.runCommand("enterFullscreen", () =>
      this.adapter?.enterFullscreen?.()
    );
  }
  exitFullscreen(): Promise<void> {
    return this.runCommand("exitFullscreen", () =>
      this.adapter?.exitFullscreen?.()
    );
  }
  enterPictureInPicture(): Promise<void> {
    return this.runCommand("enterPictureInPicture", () =>
      this.adapter?.enterPictureInPicture?.()
    );
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
  private runPlaybackCommand(command: "play" | "pause"): Promise<void> {
    this.playbackCommandGeneration += 1;
    const execute =
      command === "play"
        ? handleVibePlayerControllerPlay
        : handleVibePlayerControllerPause;
    return this.runCommand(
      command,
      (updateState) => execute({ adapter: this.adapter, updateState }),
      this.playbackCommandGeneration
    );
  }
  private runCommand(
    command: string,
    execute: (
      updateState: (next: Partial<VibePlayerControllerState>) => void
    ) => Promise<void> | undefined,
    playbackGeneration?: number
  ): Promise<void> {
    const { operationGeneration } = this;
    const isCurrent = () =>
      this.isCurrentOperation(operationGeneration) &&
      (playbackGeneration === undefined ||
        playbackGeneration === this.playbackCommandGeneration);
    const updateIfCurrent = (next: Partial<VibePlayerControllerState>) => {
      if (isCurrent()) {
        this.updateState(next);
      }
    };
    return runVibePlayerControllerCommand({
      adapter: this.adapter,
      command,
      emitAnalytics: (event) => this.onAnalyticsEvent?.(event),
      execute: () => execute(updateIfCurrent),
      getState: () => this.state,
      isCurrent,
      updateState: updateIfCurrent,
    });
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
    const previousError = this.state.error;
    this.state = { ...this.state, ...next };
    this.notify();
    if (next.error && next.error !== previousError) {
      try {
        this.onError?.(next.error);
      } catch {
        // Diagnostic observers must not replace the original playback failure.
      }
    }
    return this.state;
  }
  private isCurrentOperation(operationGeneration: number): boolean {
    return this.operationGeneration === operationGeneration;
  }
}
