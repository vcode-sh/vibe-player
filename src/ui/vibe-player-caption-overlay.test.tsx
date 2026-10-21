import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";

describe("VibePlayerCaptionOverlay", () => {
  it("announces literal caption lines and removes expired text", () => {
    const { container, rerender } = render(
      <VibePlayerCaptionOverlay lines={["First", "<b>Second</b>"]} />
    );

    const announcement = container.querySelector('[aria-live="polite"]');
    expect(announcement?.textContent).toBe("First\n<b>Second</b>");
    expect(container.querySelector("b")).toBeNull();

    rerender(<VibePlayerCaptionOverlay lines={["Replacement"]} />);
    expect(container.textContent).toBe("Replacement");
    rerender(<VibePlayerCaptionOverlay lines={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
