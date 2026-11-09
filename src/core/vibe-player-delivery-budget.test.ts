import { describe, expect, it } from "vitest";
import { VibePlayerDeliveryBudget } from "./vibe-player-delivery-budget";
import { VibePlayerOrderedDelivery } from "./vibe-player-ordered-delivery";

interface Value {
  loop: boolean;
}

describe("ordered delivery budget", () => {
  it("delivers again after a settle handler threw", () => {
    const budget = new VibePlayerDeliveryBudget();
    const delivered: Value[] = [];
    const delivery: VibePlayerOrderedDelivery<Value> =
      new VibePlayerOrderedDelivery<Value>(
        (value) => {
          delivered.push(value);
          if (value.loop) {
            delivery.publish({ loop: true });
          }
        },
        {
          settle: () => {
            throw new Error("Settle failed");
          },
        },
        budget
      );

    expect(() => delivery.publish({ loop: true })).toThrow("Settle failed");
    delivered.length = 0;
    delivery.publish({ loop: false });

    expect(delivered).toEqual([{ loop: false }]);
  });
});
