import {
  VibePlayerDeliveryBudget,
  type VibePlayerOverflowHandlers,
} from "./vibe-player-delivery-budget";

/**
 * Delivers published values one at a time and in publish order. A value
 * published while a delivery runs (for example by an observer that changes
 * state) waits until that delivery finished, so every observer receives
 * every value exactly once, in order. Observers that keep publishing are cut
 * off once the shared budget of the outer delivery runs out; the remaining
 * values are dropped and the overflow handlers settle and report it, so a
 * feedback loop never hangs the page.
 */
export class VibePlayerOrderedDelivery<T extends object> {
  private draining = false;
  private readonly queue: T[] = [];
  private readonly budget: VibePlayerDeliveryBudget;
  private readonly deliver: (value: T) => void;
  private readonly handlers: VibePlayerOverflowHandlers;

  constructor(
    deliver: (value: T) => void,
    handlers: VibePlayerOverflowHandlers = {},
    budget = new VibePlayerDeliveryBudget()
  ) {
    this.deliver = deliver;
    this.handlers = handlers;
    this.budget = budget;
  }

  publish(value: T): void {
    if (this.budget.dropping) {
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
    for (
      let value = this.queue.shift();
      value !== undefined;
      value = this.queue.shift()
    ) {
      if (!this.budget.spend()) {
        this.budget.overflow(this.handlers);
        return;
      }
      this.deliver(value);
    }
  }
}
