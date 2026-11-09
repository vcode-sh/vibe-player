/** Values one delivery may deliver within one outer delivery. */
export const VIBE_PLAYER_DELIVERY_LIMIT = 1000;

/** What an ordered delivery does once a runaway loop cut it off. */
export interface VibePlayerOverflowHandlers {
  /**
   * Reports the runaway once the outer delivery ended. Only the delivery
   * that reached its limit first reports, so one loop is reported once.
   */
  report?: () => void;
  /**
   * Runs before the counts reset, while this delivery drops what is
   * published to it, so it can bring its own observers up to date without
   * restarting the loop.
   */
  settle?: () => void;
}

/**
 * The delivery bound shared by the ordered deliveries of a controller. A
 * delivery published while another one drains nests inside it. Each
 * delivery counts what it delivers until the outermost one ends, so nested
 * loops cannot multiply the bound, and one delivery running away never
 * drops the values of another. A per-drain delivery (the raw feed) only
 * bounds each of its own drains, so a runaway elsewhere never makes it drop
 * a release or playback entry.
 */
export class VibePlayerDeliveryBudget {
  private depth = 0;
  private overflows: VibePlayerOverflowHandlers[] = [];
  private readonly settling = new Set<VibePlayerOverflowHandlers>();
  private readonly spent = new Map<VibePlayerOverflowHandlers, number>();

  /** True while the delivery owning `handlers` settles an overflow. */
  isDropping(handlers: VibePlayerOverflowHandlers): boolean {
    return this.settling.has(handlers);
  }

  enter(): void {
    this.depth += 1;
  }

  /** Counts one delivery; false once the delivery reached its limit. */
  spend(handlers: VibePlayerOverflowHandlers): boolean {
    const spent = this.spent.get(handlers) ?? 0;
    if (spent >= VIBE_PLAYER_DELIVERY_LIMIT) {
      return false;
    }
    this.spent.set(handlers, spent + 1);
    return true;
  }

  /** A delivery dropped values because it reached its limit. */
  overflow(handlers: VibePlayerOverflowHandlers): void {
    if (!this.overflows.includes(handlers)) {
      this.overflows.push(handlers);
    }
  }

  exit(): void {
    this.depth -= 1;
    if (this.depth > 0) {
      return;
    }
    const { overflows } = this;
    this.overflows = [];
    try {
      this.settle(overflows);
    } finally {
      this.spent.clear();
    }
    overflows[0]?.report?.();
  }

  private settle(overflows: readonly VibePlayerOverflowHandlers[]): void {
    for (const handlers of overflows) {
      this.settling.add(handlers);
    }
    try {
      for (const handlers of overflows) {
        handlers.settle?.();
      }
    } finally {
      // A delivery nested in a settle ends on its own; keep the outer set.
      for (const handlers of overflows) {
        this.settling.delete(handlers);
      }
    }
  }
}
