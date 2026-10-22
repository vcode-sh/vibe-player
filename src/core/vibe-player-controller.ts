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
import { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import { VibePlayerPauseIntent } from "./vibe-player-pause-intent";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

export class VibePlayerController {
  private adapter: VibePlayerAdapter | null = null;
  private adapterUnsubscribe: (() => void) | null = null;
  private readonly adapterFactory: VibePlayerControllerOptions["adapterFactory"];
  private readonly analyticsSession: VibePlayerAnalyticsSession;
  private readonly observers: VibePlayerControllerObservers;
  private readonly resumeStore: VibePlayerControllerOptions["resumeStore"];
  private operationGeneration = 0;
  private playbackCommandGeneration = 0;
  private readonly pauseIntent = new VibePlayerPauseIntent();
  private target: HTMLElement | null = null;
  private presentationTarget: HTMLElement | null = null;
  constructor(options: VibePlayerControllerOptions) {
    this.adapterFactory = options.adapterFactory;
    this.observers = new VibePlayerControllerObservers(options);
    this.resumeStore = this.observers.wrapResumeStore();
    this.analyticsSession = new VibePlayerAnalyticsSession(
      this.observers.emitAnalytics
    );
  }
  getState(): VibePlayerControllerState {
    return this.observers.state;
  }
  subscribe(listener: (state: VibePlayerControllerState) => void): () => void {
    return this.observers.subscribe(listener);
  }
  async mount(target: HTMLElement, presentationTarget = target): Promise<void> {
    const targetChanged =
      this.target !== target ||
      this.presentationTarget !== presentationTarget ||
      !this.observers.state.isMounted;
    this.target = target;
    this.presentationTarget = presentationTarget;
    if (targetChanged) {
      this.observers.updateState({ isMounted: true });
    }
    const { adapter, operationGeneration } = this;
    await mountVibePlayerControllerAdapter({
      adapter,
      emitAnalytics: this.observers.emitAnalytics,
      isCurrent: () =>
        this.isCurrentOperation(operationGeneration) &&
        this.adapter === adapter &&
        this.target === target &&
        this.presentationTarget === presentationTarget,
      presentationTarget,
      source: this.observers.state.currentSource,
      target,
      targetChanged,
      updateState: (next) => this.observers.updateState(next),
    });
  }

  async unmount(): Promise<void> {
    this.operationGeneration += 1;
    this.pauseIntent.clear();
    const { operationGeneration } = this;
    this.target = null;
    this.presentationTarget = null;
    await this.adapter?.unmount();
    if (this.isCurrentOperation(operationGeneration) && this.target === null) {
      this.observers.updateState({ isMounted: false });
    }
  }
  async load(source: VibePlayerSource): Promise<void> {
    this.operationGeneration += 1;
    this.pauseIntent.clear();
    await loadVibePlayerControllerSource({
      adapterFactory: this.adapterFactory,
      analyticsSession: this.analyticsSession,
      currentState: this.observers.state,
      emitAnalytics: this.observers.emitAnalytics,
      handleAdapterEvent: (event) => this.handleAdapterEvent(event),
      isCurrentOperation: (generation) => this.isCurrentOperation(generation),
      operationGeneration: this.operationGeneration,
      presentationTarget: this.presentationTarget,
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
      updateState: (next) => this.observers.updateState(next),
    });
  }
  async closeSource(): Promise<void> {
    this.operationGeneration += 1;
    this.pauseIntent.clear();
    const { operationGeneration } = this;
    this.analyticsSession.close(this.observers.state);
    await this.teardownAdapter();
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.analyticsSession.clear();
    this.observers.reset(this.observers.state.isMounted);
  }
  play(): Promise<void> {
    return this.runPlaybackCommand("play");
  }
  pause(): Promise<void> {
    return this.runPlaybackCommand("pause");
  }
  seekTo(seconds: number): Promise<void> {
    const { adapter, operationGeneration } = this;
    return this.runCommand("seekTo", () =>
      handleVibePlayerControllerSeek({
        adapter,
        currentSource: this.observers.state.currentSource,
        emitAnalytics: this.observers.emitAnalytics,
        isCurrent: () =>
          this.isCurrentOperation(operationGeneration) &&
          this.adapter === adapter,
        resumeStore: this.resumeStore,
        seconds,
        syncFromAdapter: () => this.syncFromAdapter(),
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
  exitPictureInPicture(): Promise<void> {
    return this.runCommand("exitPictureInPicture", () =>
      this.adapter?.exitPictureInPicture?.()
    );
  }
  async teardown(): Promise<void> {
    this.operationGeneration += 1;
    this.pauseIntent.clear();
    const { operationGeneration } = this;
    this.analyticsSession.close(this.observers.state);
    await this.teardownAdapter();
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.analyticsSession.clear();
    this.target = null;
    this.presentationTarget = null;
    this.observers.reset();
  }
  private runPlaybackCommand(command: "play" | "pause"): Promise<void> {
    this.playbackCommandGeneration += 1;
    this.pauseIntent.begin(command, this.adapter);
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
        if (next.lastEvent === "error") {
          this.pauseIntent.clear();
        }
        this.observers.updateState(next);
      }
    };
    return runVibePlayerControllerCommand({
      adapter: this.adapter,
      command,
      emitAnalytics: this.observers.emitAnalytics,
      execute: () => execute(updateIfCurrent),
      getState: () => this.observers.state,
      isCurrent,
      updateState: updateIfCurrent,
    });
  }
  private handleAdapterEvent(event: VibePlayerAdapterEvent): void {
    const { adapter, operationGeneration } = this;
    const { currentSource, playbackBlocked } = this.observers.state;
    const isCurrent = () =>
      this.isCurrentOperation(operationGeneration) &&
      this.adapter === adapter &&
      this.observers.state.currentSource === currentSource;
    handleVibePlayerAdapterEvent({
      adapter,
      analyticsSession: this.analyticsSession,
      currentSource,
      emitAnalytics: this.observers.emitAnalytics,
      event,
      isCurrent,
      playbackBlocked,
      preservePausedIntent: this.pauseIntent.shouldPreserve(event),
      resumeStore: this.resumeStore,
      updateState: (next) => this.observers.updateState(next, isCurrent),
    });
  }
  private syncFromAdapter(): void {
    if (!this.adapter) {
      return;
    }
    this.observers.updateState({
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
  private isCurrentOperation(operationGeneration: number): boolean {
    return this.operationGeneration === operationGeneration;
  }
}
