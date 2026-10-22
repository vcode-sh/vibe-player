import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { VibePlayerTimeline } from "./vibe-player-timeline";

it("uses the keyboard seek position after pointer preview without moving the pointer away", () => {
  const onSeek = vi.fn();
  const props = {
    duration: 100,
    onSeek,
    seekThumbnails: [
      { endTime: 50, startTime: 0, url: "/first.jpg" },
      { endTime: 100, startTime: 50, url: "/second.jpg" },
    ],
  };
  const { container, rerender } = render(
    <VibePlayerTimeline {...props} currentTime={0} />
  );
  const timeline = container.querySelector<HTMLElement>(
    "[data-vibe-player-timeline]"
  );
  if (!timeline) {
    throw new Error("Missing timeline");
  }
  timeline.getBoundingClientRect = () => new DOMRect(0, 0, 200, 32);
  fireEvent.focus(screen.getByRole("slider"));
  fireEvent.pointerMove(timeline, { clientX: 50 });
  expect(screen.getByRole("status")).toHaveTextContent("00:25");
  expect(container.querySelector("img")).toHaveAttribute("src", "/first.jpg");
  expect(onSeek).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole("slider"), { target: { value: "85" } });
  rerender(<VibePlayerTimeline {...props} currentTime={85} />);
  expect(onSeek).toHaveBeenCalledWith(85);
  expect(screen.getByRole("status")).toHaveTextContent("01:25");
  expect(container.querySelector("img")).toHaveAttribute("src", "/second.jpg");
  fireEvent.pointerMove(timeline, { clientX: 50 });
  expect(screen.getByRole("status")).toHaveTextContent("01:25");
  fireEvent.pointerMove(timeline, { clientX: 52 });
  expect(screen.getByRole("status")).toHaveTextContent("00:26");
});
