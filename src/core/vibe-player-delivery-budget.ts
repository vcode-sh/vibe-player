/** Deliveries one outer delivery may make before it counts as a runaway loop. */
const VIBE_PLAYER_DELIVERY_LIMIT = 1000;

/** What an ordered delivery does once a runaway loop cut it off. */
export interface VibePlayerOverflowHandlers {
  /**
   * Reports the runaway once the outer delivery ended. Only the outermost
   * delivery that overflowed reports, so one loop is reported once.
   */
  report?: () => void;
  /**
   * Runs before the budget resets, while every publish is dropped, so it can
   * bring its own observers up to date without restarting the loop.
   */
  settle?: () => void;
}

interface Overflow {
  depth: number;
  handlers: VibePlayerOverflowHandlers;
}

/**
 * One delivery bound shared by every ordered delivery of a controller. A
 * delivery published while another one drains nests inside it; all of them
 * spend from the same total, which refills when the outermost one ends.
 */
export class VibePlayerDeliveryBudget {
  private depth = 0;
  private overflows: Overflow[] = [];
  private settling = false;
  private spent = 0;

  /** True while overflowed deliveries settle: publishes are dropped. */
  get dropping(): boolean {
    return this.settling;
  }

  enter(): void {
    this.depth += 1;
  }

  /** Takes one delivery from the budget; false once it is used up. */
  spend(): boolean {
    if (this.spent >= VIBE_PLAYER_DELIVERY_LIMIT) {
      return false;
    }
    this.spent += 1;
    return true;
  }

  /** A delivery dropped values because the budget ran out. */
  overflow(handlers: VibePlayerOverflowHandlers): void {
    if (!this.overflows.some((overflow) => overflow.handlers === handlers)) {
      this.overflows.push({ depth: this.depth, handlers });
    }
  }

  exit(): void {
    this.depth -= 1;
    if (this.depth > 0) {
      return;
    }
    const { overflows } = this;
    this.overflows = [];
    if (overflows.length > 0) {
      this.settle(overflows);
    }
    this.spent = 0;
    reportOutermost(overflows);
  }

  private settle(overflows: readonly Overflow[]): void {
    this.settling = true;
    try {
      for (const { handlers } of overflows) {
        handlers.settle?.();
      }
    } finally {
      this.settling = false;
    }
  }
}

function reportOutermost(overflows: readonly Overflow[]): void {
  let outermost: Overflow | undefined;
  for (const overflow of overflows) {
    if (!outermost || overflow.depth < outermost.depth) {
      outermost = overflow;
    }
  }
  outermost?.handlers.report?.();
}
