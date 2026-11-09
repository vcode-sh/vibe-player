import { createInitialControllerState } from "./vibe-player-controller-state";
import { VibePlayerDeliveryBudget } from "./vibe-player-delivery-budget";
import { VibePlayerEventListeners } from "./vibe-player-event-listeners";
import {
  VibePlayerHostCallbacks,
  type VibePlayerHostRun,
  wrapVibePlayerResumeStore,
} from "./vibe-player-host-callbacks";
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
import { VibePlayerStateDelivery } from "./vibe-player-state-delivery";
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

const runawayMessage =
  "Observers kept changing the player while being notified; the remaining notifications were dropped.";

/** Keeps optional host integrations outside playback and disposal control flow. */
export class VibePlayerControllerObservers {
  /** Shared by every ordered delivery of this controller, the raw feed too. */
  readonly deliveryBudget = new VibePlayerDeliveryBudget();
  private readonly eventListeners = new VibePlayerEventListeners();
  private readonly options: VibePlayerControllerOptions;
  private currentState = createInitialControllerState();
  private readonly reporter = new VibePlayerIntegrationReporter({
    emit: (event) => this.emitEvent(event),
    source: () => this.currentState.currentSource,
  });
  private readonly states = new VibePlayerStateDelivery({
    budget: this.deliveryBudget,
    latest: () => this.currentState,
    reporter: this.reporter,
    reportRunaway: (first) => this.reportRunaway("state-listener", first),
  });
  private readonly events = new VibePlayerOrderedDelivery(
    (event: VibePlayerEvent) => this.deliverEvent(event),
    { report: (first) => this.reportRunaway("event", first) },
    this.deliveryBudget
  );

  private readonly hostRun: VibePlayerHostRun = (
    operation,
    execute,
    fallback
  ) => this.run(operation, execute, fallback);
  private readonly callbacks: VibePlayerHostCallbacks;

  constructor(options: VibePlayerControllerOptions) {
    this.options = options;
    this.callbacks = new VibePlayerHostCallbacks(options, this.hostRun);
  }

  get state(): VibePlayerControllerState {
    return this.currentState;
  }

  beginSession(): void {
    this.reporter.beginSession();
    this.callbacks.reset();
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
    this.callbacks.afterEvent(event.type, state);
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

  subscribe(listener: (state: VibePlayerControllerState) => void): () => void {
    return this.states.subscribe(listener);
  }

  /**
   * Observers kept changing the player while `operation` notified them;
   * `first` marks the delivery that reached its limit first.
   */
  reportRunaway(operation: string, first = false): void {
    this.reporter.report(
      operation,
      new Error(runawayMessage),
      undefined,
      undefined,
      first ? { first: true } : {}
    );
  }

  /** Delivers `state` to every subscriber, in order. */
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
    return wrapVibePlayerResumeStore(this.options.resumeStore, this.hostRun);
  }

  private run<T>(
    operation: string,
    execute: () => T,
    fallback?: T,
    source = this.currentState.currentSource
  ): T | undefined {
    return this.reporter.run(operation, execute, fallback, source);
  }

  private deliverEvent(event: VibePlayerEvent): void {
    const deliver = () => {
      // Taken before onEvent runs, so a listener it adds waits for the next.
      const listeners = this.eventListeners.matching(event);
      this.run("event", () => this.options.onEvent?.(event));
      for (const listener of listeners) {
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
