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

  it("recomputes collision correction on resize and removes it on blur", async () => {
    const { unmount } = render(
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
    setRect(stage, createRect({ left: 0, right: 240 }));
    fireEvent(window, new Event("resize"));
    expect(bubble.style.marginLeft).toBe("");

    fireEvent.blur(screen.getByRole("button", { name: "Trigger" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
    unmount();
  });

  it("suppresses a visible tooltip when its competing popover disables it", () => {
    const { rerender } = render(
      <VibePlayerTooltip label="Mute" shortcut="M">
        <button type="button">Trigger</button>
      </VibePlayerTooltip>
    );
    fireEvent.focus(screen.getByRole("button", { name: "Trigger" }));
    expect(screen.getByRole("tooltip", { name: "Mute M" })).toBeInTheDocument();

    rerender(
      <VibePlayerTooltip disabled={true} label="Mute" shortcut="M">
        <button type="button">Trigger</button>
      </VibePlayerTooltip>
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Trigger" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
