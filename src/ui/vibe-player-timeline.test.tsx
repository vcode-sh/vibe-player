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

  it("clamps a primary drag to media bounds and stops seeking on release", () => {
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
    timeline.hasPointerCapture = () => true;
    timeline.releasePointerCapture = vi.fn();
    timeline.getBoundingClientRect = () =>
      ({
        bottom: 32,
        height: 32,
        left: 10,
        right: 210,
        toJSON: () => ({}),
        top: 0,
        width: 200,
        x: 10,
        y: 0,
      }) satisfies DOMRect;

    fireEvent.pointerDown(timeline, {
      clientX: 60,
      isPrimary: false,
      pointerId: 2,
    });
    expect(onSeek).not.toHaveBeenCalled();
    fireEvent.pointerDown(timeline, {
      clientX: 60,
      isPrimary: true,
      pointerId: 1,
    });

    expect(input).toHaveFocus();
    fireEvent.pointerMove(timeline, { clientX: -10, pointerId: 1 });
    fireEvent.pointerMove(timeline, { clientX: 250, pointerId: 1 });
    expect(onSeek.mock.calls).toEqual([[25], [0], [100]]);
    fireEvent.pointerUp(timeline, { pointerId: 1 });
    fireEvent.pointerMove(timeline, { clientX: 100, pointerId: 1 });
    expect(onSeek.mock.calls).toEqual([[25], [0], [100]]);
    expect(timeline.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it.each([
    { disabled: false, duration: 0 },
    { disabled: true, duration: 100 },
  ])(
    "refuses pointer seek for $duration seconds, disabled=$disabled",
    ({ disabled, duration }) => {
      const onSeek = vi.fn();
      const { container } = render(
        <VibePlayerTimeline
          currentTime={0}
          disabled={disabled}
          duration={duration}
          onSeek={onSeek}
        />
      );
      const timeline = container.querySelector<HTMLElement>(
        "[data-vibe-player-timeline]"
      );
      if (!timeline) {
        throw new Error("Timeline root missing");
      }
      timeline.setPointerCapture = vi.fn();
      timeline.getBoundingClientRect = () => new DOMRect(10, 0, 200, 32);

      expect(screen.getByRole("slider", { name: "Seek" })).toBeDisabled();
      fireEvent.pointerDown(timeline, {
        clientX: 60,
        isPrimary: true,
        pointerId: 1,
      });
      fireEvent.pointerMove(timeline, { clientX: 100, pointerId: 1 });
      expect(onSeek).not.toHaveBeenCalled();
    }
  );
});
