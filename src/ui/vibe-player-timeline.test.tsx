import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VibePlayerTimeline } from "./vibe-player-timeline";

describe("VibePlayerTimeline", () => {
  it("renders progress and forwards range changes", () => {
    const onSeek = vi.fn();
    render(
      <VibePlayerTimeline currentTime={25} duration={100} onSeek={onSeek} />
    );

    const input = screen.getByRole("slider", { name: "Seek" });
    expect(input).toHaveAttribute("aria-valuetext", "00:25 of 01:40");
    fireEvent.change(input, { target: { value: "42" } });
    expect(onSeek).toHaveBeenCalledWith(42);
  });

  it("seeks from wrapper geometry during pointer interaction", () => {
    const onSeek = vi.fn();
    const { container } = render(
      <VibePlayerTimeline currentTime={0} duration={100} onSeek={onSeek} />
    );
    const timeline = container.querySelector<HTMLElement>(
      "[data-vibe-player-timeline]"
    );
    const input = screen.getByRole("slider", { name: "Seek" });

    if (!timeline) {
      throw new Error("Timeline root missing");
    }

    timeline.setPointerCapture = vi.fn();
    timeline.getBoundingClientRect = () =>
      ({
        bottom: 32,
        height: 32,
        left: 10,
        right: 210,
        top: 0,
        width: 200,
        x: 10,
        y: 0,
        toJSON: () => ({}),
      }) satisfies DOMRect;

    fireEvent.pointerDown(timeline, {
      clientX: 60,
      isPrimary: true,
      pointerId: 1,
    });

    expect(input).toHaveFocus();
    expect(onSeek).toHaveBeenCalledWith(25);
  });

  it("disables seek when duration is unavailable", () => {
    render(
      <VibePlayerTimeline currentTime={0} duration={0} onSeek={vi.fn()} />
    );

    expect(screen.getByRole("slider", { name: "Seek" })).toBeDisabled();
  });
});
