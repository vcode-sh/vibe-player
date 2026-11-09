import type { VibePlayerControllerState } from "./vibe-player-controller-types";
import {
  observeHostRejection,
  type VibePlayerIntegrationReporter,
} from "./vibe-player-integration-reporter";
import type { VibePlayerStateListeners } from "./vibe-player-state-listeners";

/**
 * Brings `subscribe()` listeners up to the latest state after an overflow.
 * Deliveries that overflowed drop what is published while they settle, so a
 * listener's throw waits for the overflow report. Each failure keeps the
 * source and session of the state it received: nothing is reported for a
 * state without a source, or once that source or session ended.
 */
export class VibePlayerStateSettle {
  private pending: (() => void)[] = [];
  private readonly latest: () => VibePlayerControllerState;
  private readonly listeners: VibePlayerStateListeners<VibePlayerControllerState>;
  private readonly reporter: VibePlayerIntegrationReporter;
  private readonly active: () => boolean;

  /** `active` turns false when the controller retires: settling stops. */
  constructor(
    listeners: VibePlayerStateListeners<VibePlayerControllerState>,
    reporter: VibePlayerIntegrationReporter,
    latest: () => VibePlayerControllerState,
    active: () => boolean = () => true
  ) {
    this.listeners = listeners;
    this.reporter = reporter;
    this.latest = latest;
    this.active = active;
  }

  settle(): void {
    this.listeners.settle(this.latest, (listener, state) => {
      if (!this.active()) {
        return;
      }
      const report = this.reporter.reportLater(
        "state-listener",
        state.currentSource
      );
      try {
        observeHostRejection(listener(state), report);
      } catch (cause) {
        this.pending.push(() => report(cause));
      }
    });
  }

  /** Reports the throws kept while settling. */
  flush(): void {
    const { pending } = this;
    this.pending = [];
    for (const report of pending) {
      report();
    }
  }
}
