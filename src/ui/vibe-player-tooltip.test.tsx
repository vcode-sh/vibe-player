import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getVibePlayerTooltipCollisionOffset,
  VibePlayerTooltip,
} from "./vibe-player-tooltip";

interface RectInput {
  bottom?: number;
  left: number;
  right: number;
  top?: number;
}

function createRect({ bottom = 24, left, right, top = 0 }: RectInput): DOMRect {
  const width = right - left;
  return {
    bottom,
    height: bottom - top,
    left,
    right,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect;
}

function setRect(element: Element, rect: DOMRect): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => rect,
  });
}

describe("VibePlayerTooltip", () => {
  it("calculates the smallest horizontal offset inside a padded boundary", () => {
    expect(
      getVibePlayerTooltipCollisionOffset(
        createRect({ left: 80, right: 180 }),
        createRect({ left: 0, right: 120 })
      )
    ).toBe(-68);
    expect(
      getVibePlayerTooltipCollisionOffset(
        createRect({ left: -20, right: 40 }),
        createRect({ left: 0, right: 120 })
      )
    ).toBe(28);
    expect(
      getVibePlayerTooltipCollisionOffset(
        createRect({ left: 24, right: 96 }),
        createRect({ left: 0, right: 120 })
      )
    ).toBe(0);
  });

  it("keeps an end-aligned tooltip inside the player stage", async () => {
    render(
      <div className="vibe-player-stage">
        <VibePlayerTooltip align="end" label="Picture in picture">
          <button type="button">Trigger</button>
        </VibePlayerTooltip>
      </div>
    );

    const stage = screen.getByText("Trigger").closest(".vibe-player-stage");
    const bubble = screen.getByRole("tooltip", { hidden: true });
    if (!(stage instanceof HTMLElement)) {
      throw new Error("Missing player stage");
    }
    setRect(stage, createRect({ left: 0, right: 120 }));
    setRect(bubble, createRect({ left: 80, right: 180 }));

    fireEvent.focus(screen.getByRole("button", { name: "Trigger" }));

    await waitFor(() => {
      expect(bubble).toHaveStyle({ marginLeft: "-68px" });
    });
  });
});
