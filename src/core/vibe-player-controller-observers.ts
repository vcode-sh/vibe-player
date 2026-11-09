import { createInitialControllerState } from "./vibe-player-controller-state";
import { VibePlayerEventListeners } from "./vibe-player-event-listeners";
import type {
  VibePlayerEvent,
  VibePlayerEventOfType,
  VibePlayerEventType,
} from "./vibe-player-host-events";
import {
  observeHostRejection,
  VibePlayerIntegrationReporter,
} from "./vibe-player-integration-reporter";
import { VibePlayerOrderedDelivery } from "./vibe-player-ordered-delivery";
import type {
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerError,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "./vibe-player-types";
import type { VibePlayerWatchedRangesReport } from "./vibe-player-watched-ranges";

type StateListener = (state: VibePlayerControllerState) => void;

const runawayMessage =
  "Observers kept changing the player while being notified; the remaining notifications were dropped.";

/** Keeps optional host integrations outside playback and disposal control flow. */
export class VibePlayerControllerObservers {
  private readonly listeners = new Set<StateListener>();
  private readonly eventListeners = new VibePlayerEventListeners();
  private lastProgressAt = Number.NEGATIVE_INFINITY;
  private readonly options: VibePlayerControllerOptions;
  private currentState = createInitialControllerState();
  private readonly reporter = new VibePlayerIntegrationReporter({
    emit: (event) => this.emitEvent(event),
    source: () => this.currentState.currentSource,
  });
  private readonly states = new VibePlayerOrderedDelivery(
    (state: VibePlayerControllerState) => this.deliverState(state),
    () => this.reporter.report("state-listener", new Error(runawayMessage))
  );
  private readonly events = new VibePlayerOrderedDelivery(
    (event: VibePlayerEvent) => this.deliverEvent(event),
    () => this.reporter.report("event", new Error(runawayMessage))
  );

  constructor(options: VibePlayerControllerOptions) {
    this.options = options;
  }

  get state(): VibePlayerControllerState {
    return this.currentState;
  }

  beginSession(): void {
    this.reporter.beginSession();
    this.lastProgressAt = Number.NEGATIVE_INFINITY;
  }

  /** Events published while observers run are queued, never reordered. */
  emitEvent(event: VibePlayerEvent): void {
    this.events.publish(event);
  }

  on<K extends VibePlayerEventType | "*">(
    type: K,
    listener: (event: VibePlayerEventOfType<K>) => void
  ): () => void {
    return this.eventListeners.add(type, listener);
  }

  emitAdapterEvent(
    event: VibePlayerAdapterEvent,
    isCurrent = () => true
  ): void {
    const state = this.currentState;
    if (!state.currentSource) {
      return;
    }
    this.emitEvent({ ...event, source: state.currentSource });
    if (state !== this.currentState || !isCurrent()) {
      return;
    }
    if (event.type === "play") {
      this.run("onPlay", () => this.options.onPlay?.(state));
    } else if (event.type === "pause") {
      this.run("onPause", () => this.options.onPause?.(state));
    } else if (event.type === "ended") {
      this.run("onEnded", () => this.options.onEnded?.(state));
    } else if (event.type === "qualitychange") {
      this.run("onQualityChange", () => this.options.onQualityChange?.(state));
    } else if (
      event.type === "timeupdate" &&
      Date.now() - this.lastProgressAt >= 250
    ) {
      this.lastProgressAt = Date.now();
      this.run("onProgress", () => this.options.onProgress?.(state));
    }
  }

  renewed(
    previousSource: VibePlayerSource,
    source: VibePlayerSource,
    isCurrent = () => true
  ): void {
    this.emitEvent({ previousSource, source, type: "renew" });
    if (this.currentState.currentSource === source && isCurrent()) {
      this.run("onRenew", () => this.options.onRenew?.(source));
    }
  }

  reset(isMounted = false): void {
    this.currentState = { ...createInitialControllerState(), isMounted };
    this.notify(this.currentState);
  }

  updateState(
    next: Partial<VibePlayerControllerState>,
    isCurrent = () => true
  ): VibePlayerControllerState {
    const previousError = this.currentState.error;
    const state = { ...this.currentState, ...next };
    this.currentState = state;
    this.notify(state);
    if (
      next.error &&
      next.error !== previousError &&
      this.currentState.error === next.error &&
      this.currentState.currentSource === state.currentSource &&
      isCurrent()
    ) {
      this.emitError(next.error);
    }
    return this.currentState;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Every subscriber receives every state in order. A state set while
   * subscribers run waits until all of them received the current one.
   */
  notify(state: VibePlayerControllerState): void {
    this.states.publish(state);
  }

  emitError(error: VibePlayerError): void {
    try {
      observeHostRejection(this.options.onError?.(error), () => undefined);
    } catch {
      // Reporting a reporting failure would recurse and obscure the first error.
    }
  }

  readonly emitAnalytics = (event: VibePlayerAnalyticsEvent): void => {
    const source = this.currentState.currentSource;
    this.run(
      "analytics",
      () => this.options.onAnalyticsEvent?.(event),
      undefined,
      source
    );
  };

  readonly emitWatchedRanges = (report: VibePlayerWatchedRangesReport) => {
    this.run("watched-ranges", () => this.options.onWatchedRanges?.(report));
  };

  wrapResumeStore(): VibePlayerResumeStore | undefined {
    const store = this.options.resumeStore;
    if (!store) {
      return;
    }
    return {
      clear: (sourceId) =>
        this.run("resume-clear", () => store.clear(sourceId)),
      get: (sourceId) =>
        this.run("resume-get", () => store.get(sourceId), null) ?? null,
      set: (sourceId, seconds) =>
        this.run("resume-set", () => store.set(sourceId, seconds)),
    };
  }

  private run<T>(
    operation: string,
    execute: () => T,
    fallback?: T,
    source = this.currentState.currentSource
  ): T | undefined {
    return this.reporter.run(operation, execute, fallback, source);
  }

  private deliverState(state: VibePlayerControllerState): void {
    this.reporter.runAll(
      "state-listener",
      this.listeners,
      state,
      state.currentSource
    );
  }

  private deliverEvent(event: VibePlayerEvent): void {
    const deliver = () => {
      this.run("event", () => this.options.onEvent?.(event));
      for (const listener of this.eventListeners.matching(event)) {
        this.run("event-listener", listener);
      }
    };
    if (event.type === "integrationerror") {
      this.reporter.whileReporting(deliver);
    } else {
      deliver();
    }
  }
}
