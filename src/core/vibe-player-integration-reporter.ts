import { createVibePlayerError } from "./vibe-player-errors";
import type { VibePlayerIntegrationEvent } from "./vibe-player-host-events";
import type { VibePlayerSource } from "./vibe-player-source-types";

interface IntegrationReporterHost {
  emit(event: VibePlayerIntegrationEvent): void;
  source(): VibePlayerSource | null;
}

/**
 * Isolates host code: a throw or rejection becomes a nonfatal
 * `integrationerror` for the source and session it happened in, and never
 * interrupts playback or the observers that run after it.
 */
export class VibePlayerIntegrationReporter {
  private reporting = false;
  private session = 0;
  private readonly host: IntegrationReporterHost;

  constructor(host: IntegrationReporterHost) {
    this.host = host;
  }

  beginSession(): void {
    this.session += 1;
  }

  run<T>(
    operation: string,
    execute: () => T,
    fallback?: T,
    source = this.host.source()
  ): T | undefined {
    const { reporting, session } = this;
    try {
      const result = execute();
      observeHostRejection(result, (cause) => {
        if (!reporting) {
          this.report(operation, cause, source, session);
        }
      });
      return result;
    } catch (cause) {
      this.report(operation, cause, source, session);
      return fallback;
    }
  }

  /** Calls every listener first; synchronous failures are reported after. */
  runAll<T>(
    operation: string,
    listeners: Iterable<(value: T) => unknown>,
    value: T,
    source: VibePlayerSource | null
  ): void {
    const failures: unknown[] = [];
    const { reporting, session } = this;
    for (const listener of listeners) {
      try {
        observeHostRejection(listener(value), (cause) => {
          if (!reporting) {
            this.report(operation, cause, source, session);
          }
        });
      } catch (cause) {
        failures.push(cause);
      }
    }
    for (const cause of failures) {
      this.report(operation, cause, source, session);
    }
  }

  /** Delivers an integration error; a failing observer of it is not reported. */
  whileReporting(deliver: () => void): void {
    const { reporting } = this;
    this.reporting = true;
    try {
      deliver();
    } finally {
      this.reporting = reporting;
    }
  }

  /**
   * Returns a reporter for a failure that surfaces later, bound to the source
   * and session current now: it reports nothing for a null source or once
   * the source or session changed.
   */
  reportLater(
    operation: string,
    source: VibePlayerSource | null
  ): (cause: unknown) => void {
    const { reporting, session } = this;
    return (cause) => {
      if (source && !reporting) {
        this.report(operation, cause, source, session);
      }
    };
  }

  /** `details` adds fields next to `operation` in the error details. */
  report(
    operation: string,
    cause: unknown,
    source = this.host.source(),
    session = this.session,
    details: Record<string, boolean> = {}
  ): void {
    if (
      this.reporting ||
      session !== this.session ||
      !source ||
      this.host.source() !== source
    ) {
      return;
    }
    const error = createVibePlayerError({
      cause,
      details: { ...details, operation },
      phase: "integration",
      source,
    });
    this.whileReporting(() =>
      this.host.emit({ error, source, type: "integrationerror" })
    );
  }
}

export function observeHostRejection(
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
