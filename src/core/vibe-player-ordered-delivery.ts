import {
  VIBE_PLAYER_DELIVERY_LIMIT,
  VibePlayerDeliveryBudget,
  type VibePlayerOverflowHandlers,
} from "./vibe-player-delivery-budget";

/** How one ordered delivery is bounded. */
export interface VibePlayerOrderedDeliveryOptions<T> {
  /** Values delivered past the limit and while settling, never dropped. */
  always?: (value: T) => boolean;
  /** Values this delivery may deliver within one outer delivery. */
  limit?: number;
}

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
  private readonly always: (value: T) => boolean;
  private readonly budget: VibePlayerDeliveryBudget;
  private readonly deliver: (value: T) => void;
  private readonly handlers: VibePlayerOverflowHandlers;
  private readonly limit: number;

  constructor(
    deliver: (value: T) => void,
    handlers: VibePlayerOverflowHandlers = {},
    budget = new VibePlayerDeliveryBudget(),
    options: VibePlayerOrderedDeliveryOptions<T> = {}
  ) {
    this.deliver = deliver;
    this.handlers = handlers;
    this.budget = budget;
    this.always = options.always ?? never;
    this.limit = options.limit ?? VIBE_PLAYER_DELIVERY_LIMIT;
  }

  publish(value: T): void {
    if (!this.always(value) && this.budget.isDropping(this.handlers)) {
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

  /** Past the limit, drops what is not `always` delivered. */
  private drain(): void {
    let cut = false;
    for (
      let value = this.queue.shift();
      value !== undefined;
      value = this.queue.shift()
    ) {
      if (!this.always(value)) {
        if (cut) {
          continue;
        }
        if (!this.budget.spend(this.handlers, this.limit)) {
          this.budget.overflow(this.handlers);
          cut = true;
          continue;
        }
      }
      this.deliver(value);
    }
  }
}

function never(): boolean {
  return false;
}
