import {
  VIBE_PLAYER_DELIVERY_LIMIT,
  VibePlayerDeliveryBudget,
  type VibePlayerOverflowHandlers,
} from "./vibe-player-delivery-budget";

/**
 * Delivers published values one at a time and in publish order. A value
 * published while a delivery runs (for example by an observer that changes
 * state) waits until that delivery finished, so every observer receives
 * every value exactly once, in order. Observers that keep publishing are cut
 * off once this delivery reached its limit within the outer delivery; its
 * remaining values are dropped and the overflow handlers settle and report
 * it, so a feedback loop never hangs the page.
 */
export class VibePlayerOrderedDelivery<T extends object> {
  private draining = false;
  private readonly queue: T[] = [];
  private readonly budget: VibePlayerDeliveryBudget;
  private readonly deliver: (value: T) => void;
  private readonly handlers: VibePlayerOverflowHandlers;

  private readonly perDrain: boolean;

  /**
   * `perDrain` bounds each drain on its own instead of everything this
   * delivery delivers within the outer delivery.
   */
  constructor(
    deliver: (value: T) => void,
    handlers: VibePlayerOverflowHandlers = {},
    budget = new VibePlayerDeliveryBudget(),
    perDrain = false
  ) {
    this.deliver = deliver;
    this.handlers = handlers;
    this.budget = budget;
    this.perDrain = perDrain;
  }

  publish(value: T): void {
    if (this.budget.isDropping(this.handlers)) {
      return;
    }
    this.queue.push(value);
    if (this.draining) {
      return;
    }
    this.draining = true;
    this.budget.enter();
    try {
      this.drain();
    } finally {
      this.queue.length = 0;
      this.draining = false;
      this.budget.exit();
    }
  }

  private drain(): void {
    let drained = 0;
    for (
      let value = this.queue.shift();
      value !== undefined;
      value = this.queue.shift()
    ) {
      if (!this.spend(drained)) {
        this.budget.overflow(this.handlers);
        return;
      }
      drained += 1;
      this.deliver(value);
    }
  }

  private spend(drained: number): boolean {
    return this.perDrain
      ? drained < VIBE_PLAYER_DELIVERY_LIMIT
      : this.budget.spend(this.handlers);
  }
}
