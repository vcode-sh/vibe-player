import { createInitialControllerState } from "./vibe-player-controller-state";
import { createVibePlayerError } from "./vibe-player-errors";
import type {
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
  private readonly options: VibePlayerControllerOptions;
  private currentState = createInitialControllerState();

  constructor(options: VibePlayerControllerOptions) {
    this.options = options;
  }

  get state(): VibePlayerControllerState {
    return this.currentState;
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
    const { reporting } = this;
    for (const listener of this.listeners) {
      if (state !== this.currentState) {
        break;
      }
      try {
        observeHostRejection(listener(state), (cause) => {
          if (!reporting) {
            this.reportFailure("state-listener", cause, state.currentSource);
          }
        });
      } catch (cause) {
        failures.push(cause);
      }
    }
    for (const cause of failures) {
      this.reportFailure("state-listener", cause, state.currentSource);
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
    const { reporting } = this;
    try {
      const result = execute();
      observeHostRejection(result, (cause) => {
        if (!reporting) {
          this.reportFailure(operation, cause, source);
        }
      });
      return result;
    } catch (cause) {
      this.reportFailure(operation, cause, source);
      return fallback;
    }
  }

  private reportFailure(
    operation: string,
    cause: unknown,
    source: VibePlayerSource | null
  ): void {
    if (
      this.reporting ||
      !source ||
      this.currentState.currentSource !== source
    ) {
      return;
    }
    this.reporting = true;
    try {
      this.updateState({
        error: createVibePlayerError({
          cause,
          details: { operation },
          phase: "integration",
          source,
        }),
      });
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
