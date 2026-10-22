import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VibePlayerSeekPreview } from "./vibe-player-seek-preview";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

const thumbnails: readonly VibePlayerSeekThumbnail[] = [
  {
    endTime: 5,
    sprite: { height: 90, width: 160, x: 0, y: 0 },
    startTime: 0,
    url: "/sheet.jpg",
  },
  {
    endTime: 10,
    sprite: { height: 90, width: 160, x: 160, y: 90 },
    startTime: 5,
    url: "/sheet.jpg",
  },
  { endTime: 20, startTime: 12, url: "/other.jpg" },
];

function loadedImage(container: HTMLElement) {
  const image = container.querySelector("img");
  if (!image) {
    throw new Error("Missing thumbnail image");
  }
  Object.defineProperties(image, {
    naturalHeight: { configurable: true, value: 180 },
    naturalWidth: { configurable: true, value: 480 },
  });
  fireEvent.load(image);
  return image;
}

describe("seek preview images", () => {
  it("changes the crop within one loaded sheet and removes it for a gap", () => {
    const props = { duration: 20, percent: 25, seekThumbnails: thumbnails };
    const { container, rerender } = render(
      <VibePlayerSeekPreview {...props} time={4} />
    );
    expect(screen.getByRole("status")).toHaveTextContent("00:04");
    expect(container.querySelector("img")?.parentElement).not.toBeVisible();
    const image = loadedImage(container);
    expect(image.parentElement).toBeVisible();
    expect(image).toHaveStyle({ left: "0%", top: "0%", width: "300%" });
    rerender(<VibePlayerSeekPreview {...props} time={5} />);
    expect(container.querySelector("img")).toBe(image);
    expect(image).toHaveStyle({ left: "-100%", top: "-100%" });
    rerender(<VibePlayerSeekPreview {...props} time={10} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("00:10");
  });

  it("hides a previous image while the replacement loads or fails", () => {
    const props = { duration: 20, percent: 70, seekThumbnails: thumbnails };
    const { container, rerender } = render(
      <VibePlayerSeekPreview {...props} time={5} />
    );
    const previous = loadedImage(container);
    rerender(<VibePlayerSeekPreview {...props} time={14} />);
    const replacement = container.querySelector("img");
    expect(replacement).toHaveAttribute("src", "/other.jpg");
    expect(replacement?.parentElement).not.toBeVisible();
    fireEvent.load(previous);
    expect(replacement?.parentElement).not.toBeVisible();
    if (!replacement) {
      throw new Error("Missing replacement image");
    }
    fireEvent.error(replacement);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("00:14");
  });

  it("rejects a crop that extends past the decoded image", () => {
    const { container } = render(
      <VibePlayerSeekPreview
        duration={10}
        percent={50}
        seekThumbnails={[
          {
            ...thumbnails[0],
            endTime: 10,
            sprite: { height: 90, width: 160, x: 400, y: 0 },
            startTime: 0,
            url: "/small.jpg",
          },
        ]}
        time={5}
      />
    );
    const image = loadedImage(container);
    expect(image.parentElement).not.toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("00:05");
  });
});
