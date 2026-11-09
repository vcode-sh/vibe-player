/** Deliveries one drain may make before it is treated as a runaway loop. */
const VIBE_PLAYER_DRAIN_LIMIT = 1000;

/**
 * Delivers published values one at a time and in publish order. A value
 * published while a delivery runs (for example by an observer that changes
 * state) waits until that delivery finished, so every observer receives
 * every value exactly once, in order. Observers that keep publishing are cut
 * off after a bounded drain and reported through `onOverflow`, so a feedback
 * loop never hangs the page.
 */
export class VibePlayerOrderedDelivery<T extends object> {
  private draining = false;
  private readonly queue: T[] = [];
  private readonly deliver: (value: T) => void;
  private readonly onOverflow: () => void;

  constructor(deliver: (value: T) => void, onOverflow: () => void = noop) {
    this.deliver = deliver;
    this.onOverflow = onOverflow;
  }

  publish(value: T): void {
    this.queue.push(value);
    if (this.draining) {
      return;
    }
    this.draining = true;
    let overflowed = false;
    try {
      overflowed = this.drain();
    } finally {
      this.queue.length = 0;
      this.draining = false;
    }
    if (overflowed) {
      this.onOverflow();
    }
  }

  private drain(): boolean {
    let delivered = 0;
    for (
      let value = this.queue.shift();
      value !== undefined;
      value = this.queue.shift()
    ) {
      if (delivered === VIBE_PLAYER_DRAIN_LIMIT) {
        return true;
      }
      delivered += 1;
      this.deliver(value);
    }
    return false;
  }
}

function noop(): void {
  // Internal feeds have no host to report a runaway to.
}
