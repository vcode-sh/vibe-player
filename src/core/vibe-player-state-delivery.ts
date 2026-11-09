import type { VibePlayerControllerState } from "./vibe-player-controller-types";
import type { VibePlayerDeliveryBudget } from "./vibe-player-delivery-budget";
import type { VibePlayerIntegrationReporter } from "./vibe-player-integration-reporter";
import { VibePlayerOrderedDelivery } from "./vibe-player-ordered-delivery";
import { VibePlayerStateListeners } from "./vibe-player-state-listeners";
import { VibePlayerStateSettle } from "./vibe-player-state-settle";

type StateListener = (state: VibePlayerControllerState) => void;

interface StateDeliveryInput {
  budget: VibePlayerDeliveryBudget;
  /** The controller's latest state, which settling brings listeners to. */
  latest: () => VibePlayerControllerState;
  reporter: VibePlayerIntegrationReporter;
  /** Subscribers kept changing state; `first` as the budget reports it. */
  reportRunaway: (first: boolean) => void;
}

/**
 * Delivers every state to `subscribe()` listeners in order, isolates their
 * failures and, after a runaway, settles them on the latest state.
 */
export class VibePlayerStateDelivery {
  private readonly delivery: VibePlayerOrderedDelivery<VibePlayerControllerState>;
  private readonly listeners =
    new VibePlayerStateListeners<VibePlayerControllerState>();
  private readonly reporter: VibePlayerIntegrationReporter;
  private readonly settler: VibePlayerStateSettle;
  private retired = false;

  constructor({ budget, latest, reporter, reportRunaway }: StateDeliveryInput) {
    this.reporter = reporter;
    this.settler = new VibePlayerStateSettle(
      this.listeners,
      reporter,
      latest,
      () => !this.retired
    );
    this.delivery = new VibePlayerOrderedDelivery(
      (state) => this.deliver(state),
      {
        report: (first) => {
          reportRunaway(first);
          this.settler.flush();
        },
        settle: () => this.settler.settle(),
      },
      budget
    );
  }

  subscribe(listener: StateListener): () => void {
    return this.retired ? () => undefined : this.listeners.add(listener);
  }

  /** No subscriber hears anything more, even mid-delivery or mid-settle. */
  retire(): void {
    this.retired = true;
  }

  /**
   * Every subscriber receives every state in order. A state set while
   * subscribers run waits until all of them received the current one.
   */
  publish(state: VibePlayerControllerState): void {
    this.delivery.publish(state);
  }

  private deliver(state: VibePlayerControllerState): void {
    this.reporter.runAll(
      "state-listener",
      this.live(this.listeners.current()),
      state,
      state.currentSource
    );
  }

  private *live(listeners: Iterable<StateListener>): Iterable<StateListener> {
    for (const listener of listeners) {
      if (this.retired) {
        return;
      }
      yield listener;
    }
  }
}
