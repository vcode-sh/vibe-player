import { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { loadVibePlayerControllerSource } from "./vibe-player-controller-load";
import { handleVibePlayerLoadError } from "./vibe-player-controller-load-error";
import { mountVibePlayerControllerAdapter } from "./vibe-player-controller-mount";
import type { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import {
  getVibePlayerReleaseReason,
  type VibePlayerRawFeed,
  type VibePlayerRawReleaseReason,
} from "./vibe-player-raw-feed";
import { createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

interface ControllerRuntimeOptions {
  applyPreferences(): Promise<void>;
  clearIntent(): void;
  event(event: VibePlayerAdapterEvent): void;
  feed: VibePlayerRawFeed;
  isPlayRequested(): boolean;
  observers: VibePlayerControllerObservers;
  options: VibePlayerControllerOptions;
  resumeStore: VibePlayerControllerOptions["resumeStore"];
}

/** Adapter attachment, mounting and release share one operation generation. */
export class VibePlayerControllerRuntime {
  adapter: VibePlayerAdapter | null = null;
  operationGeneration = 0;
  readonly analyticsSession: VibePlayerAnalyticsSession;
  readonly resumeStore: VibePlayerControllerOptions["resumeStore"];
  private adapterUnsubscribe: (() => void) | null = null;
  private target: HTMLElement | null = null;
  private presentationTarget: HTMLElement | null = null;
  private readonly adapterFactory: VibePlayerControllerOptions["adapterFactory"];
  private readonly observers: VibePlayerControllerObservers;
  private readonly hooks: ControllerRuntimeOptions;

  constructor(hooks: ControllerRuntimeOptions) {
    this.hooks = hooks;
    this.observers = hooks.observers;
    this.adapterFactory = hooks.options.adapterFactory;
    this.resumeStore = hooks.resumeStore;
    this.analyticsSession = new VibePlayerAnalyticsSession(
      this.observers.emitAnalytics
    );
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
      updateState: (next) => this.updateState(next),
    });
  }

  async unmount(): Promise<void> {
    const operationGeneration = this.beginOperation();
    this.target = null;
    this.presentationTarget = null;
    await this.teardownAdapter("close");
    if (this.isCurrentOperation(operationGeneration) && this.target === null) {
      this.observers.updateState({
        capabilities: null,
        isMounted: false,
        snapshot: {
          ...this.observers.state.snapshot,
          paused: true,
          readyState: "idle",
        },
      });
    }
  }

  /** Releases the adapter and the source; `dispose` drops the mount too. */
  async closeSource(dispose = false): Promise<void> {
    const operationGeneration = this.beginOperation();
    this.analyticsSession.close(this.observers.state);
    await this.teardownAdapter("close");
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.analyticsSession.clear();
    if (dispose) {
      this.target = null;
      this.presentationTarget = null;
    }
    this.observers.reset(!dispose && this.observers.state.isMounted);
  }

  teardown(): Promise<void> {
    return this.closeSource(true);
  }

  async attachSource(source: VibePlayerSource): Promise<void> {
    const operationGeneration = this.beginOperation();
    const reason = getVibePlayerReleaseReason(
      this.observers.state.currentSource,
      source
    );
    await loadVibePlayerControllerSource({
      adapterFactory: this.adapterFactory,
      analyticsSession: this.analyticsSession,
      beginSession: () => this.observers.beginSession(),
      currentState: this.observers.state,
      emitAnalytics: this.observers.emitAnalytics,
      feed: this.hooks.feed,
      handleAdapterEvent: (event) => this.hooks.event(event),
      isCurrentOperation: (generation) => this.isCurrentOperation(generation),
      operationGeneration,
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
      teardownAdapter: () => this.teardownAdapter(reason),
      updateState: (next) => this.updateState(next),
    });
    if (this.isCurrentOperation(operationGeneration)) {
      await this.hooks.applyPreferences();
    }
  }

  async prepareSource(source: VibePlayerSource): Promise<void> {
    const operationGeneration = this.beginOperation();
    this.analyticsSession.close(this.observers.state);
    await this.teardownAdapter(
      getVibePlayerReleaseReason(this.observers.state.currentSource, source)
    );
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.analyticsSession.clear();
    this.observers.beginSession();
    this.observers.updateState({
      capabilities: null,
      currentSource: source,
      error: null,
      lastEvent: null,
      playbackBlocked: false,
      snapshot: {
        ...createIdleSnapshot(),
        duration: source.durationSeconds ?? 0,
      },
    });
  }

  async suspend(loading: boolean): Promise<void> {
    const operationGeneration = this.beginOperation();
    const { snapshot, currentSource } = this.observers.state;
    await this.teardownAdapter(loading ? "reload" : "stop");
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    this.observers.updateState({
      capabilities: null,
      error: null,
      lastEvent: null,
      playbackBlocked: false,
      snapshot: {
        ...snapshot,
        paused: !loading,
        readyState: loading ? "loading" : "idle",
      },
    });
    if (!loading && currentSource) {
      this.observers.emitEvent({
        snapshot: this.observers.state.snapshot,
        source: currentSource,
        type: "stop",
      });
    }
  }

  failRenewal(cause: unknown): void {
    const source = this.observers.state.currentSource;
    if (source && !this.observers.state.error) {
      handleVibePlayerLoadError({
        adapter: this.adapter,
        cause,
        emitAnalytics: this.observers.emitAnalytics,
        phase: "load",
        source,
        updateState: (next) => this.observers.updateState(next),
      });
    }
  }

  syncFromAdapter(): void {
    if (this.adapter) {
      this.updateState({
        capabilities: this.adapter.capabilities,
        snapshot: this.adapter.getSnapshot(),
      });
    }
  }
  updateState(
    next: Partial<VibePlayerControllerState>,
    isCurrent = () => true
  ): VibePlayerControllerState {
    const { snapshot } = next;
    if (snapshot?.readyState === "loading" && this.hooks.isPlayRequested()) {
      return this.observers.updateState(
        { ...next, snapshot: { ...snapshot, paused: false } },
        isCurrent
      );
    }
    return this.observers.updateState(next, isCurrent);
  }
  private async teardownAdapter(
    reason: VibePlayerRawReleaseReason
  ): Promise<void> {
    this.adapterUnsubscribe?.();
    this.adapterUnsubscribe = null;
    const { adapter } = this;
    this.adapter = null;
    this.hooks.feed.release(reason);
    await adapter?.unmount();
  }
  isCurrentOperation(generation: number): boolean {
    return this.operationGeneration === generation;
  }
  /** Supersedes every pending operation and command intent. */
  private beginOperation(): number {
    this.operationGeneration += 1;
    this.hooks.clearIntent();
    return this.operationGeneration;
  }
}
