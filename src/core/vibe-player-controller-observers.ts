import { createInitialControllerState } from "./vibe-player-controller-state";
import { createVibePlayerError } from "./vibe-player-errors";
import type { VibePlayerEvent } from "./vibe-player-host-events";
import type {
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerError,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "./vibe-player-types";

type StateListener = (state: VibePlayerControllerState) => void;

/** Keeps optional host integrations outside playback and disposal control flow. */
export class VibePlayerControllerObservers {
  private readonly listeners = new Set<StateListener>();
  private reporting = false;
  private session = 0;
  private lastProgressAt = Number.NEGATIVE_INFINITY;
  private readonly options: VibePlayerControllerOptions;
  private currentState = createInitialControllerState();

  constructor(options: VibePlayerControllerOptions) {
    this.options = options;
  }

  get state(): VibePlayerControllerState {
    return this.currentState;
  }

  beginSession(): void {
    this.session += 1;
    this.lastProgressAt = Number.NEGATIVE_INFINITY;
  }

  emitEvent(event: VibePlayerEvent): void {
    this.run("event", () => this.options.onEvent?.(event));
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

  notify(state: VibePlayerControllerState): void {
    const failures: unknown[] = [];
    const { reporting, session } = this;
    for (const listener of this.listeners) {
      if (state !== this.currentState) {
        break;
      }
      try {
        observeHostRejection(listener(state), (cause) => {
          if (!reporting) {
            this.reportFailure(
              "state-listener",
              cause,
              state.currentSource,
              session
            );
          }
        });
      } catch (cause) {
        failures.push(cause);
      }
    }
    for (const cause of failures) {
      this.reportFailure("state-listener", cause, state.currentSource, session);
    }
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
    const { reporting, session } = this;
    try {
      const result = execute();
      observeHostRejection(result, (cause) => {
        if (!reporting) {
          this.reportFailure(operation, cause, source, session);
        }
      });
      return result;
    } catch (cause) {
      this.reportFailure(operation, cause, source, session);
      return fallback;
    }
  }

  private reportFailure(
    operation: string,
    cause: unknown,
    source: VibePlayerSource | null,
    session: number
  ): void {
    if (
      this.reporting ||
      session !== this.session ||
      !source ||
      this.currentState.currentSource !== source
    ) {
      return;
    }
    this.reporting = true;
    try {
      const error = createVibePlayerError({
        cause,
        details: { operation },
        phase: "integration",
        source,
      });
      if (
        session === this.session &&
        this.currentState.currentSource === source
      ) {
        this.emitEvent({ error, source, type: "integrationerror" });
      }
    } finally {
      this.reporting = false;
    }
  }
}

function observeHostRejection(
  result: unknown,
  onRejected: (cause: unknown) => void
): void {
  if (
    (typeof result === "object" && result !== null) ||
    typeof result === "function"
  ) {
    Promise.resolve(result).catch(onRejected);
  }
}
