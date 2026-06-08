import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";

describe("VibePlayerCaptionOverlay", () => {
  it("renders caption lines in an aria-live pointer-through overlay", () => {
    const { container } = render(
      <VibePlayerCaptionOverlay lines={["First", "Second"]} />
    );

    const text = container.querySelector(".vibe-player-caption-overlay__text");
    const overlay = container.querySelector(".vibe-player-caption-overlay");
    expect(text).toHaveTextContent("First Second");
    expect(overlay).toHaveAttribute("aria-live", "polite");
    expect(overlay).toHaveClass("vibe-player-caption-overlay");
  });

  it("renders nothing when there are no lines", () => {
    const { container } = render(<VibePlayerCaptionOverlay lines={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
