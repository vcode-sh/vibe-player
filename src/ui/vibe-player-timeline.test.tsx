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

  it("disables seek when duration is unavailable", () => {
    render(
      <VibePlayerTimeline currentTime={0} duration={0} onSeek={vi.fn()} />
    );

    expect(screen.getByRole("slider", { name: "Seek" })).toBeDisabled();
  });
});
