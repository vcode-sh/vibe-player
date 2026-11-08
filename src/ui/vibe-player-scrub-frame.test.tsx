import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

// The stage test adapter reports a 100 s duration; tiles cover 50 s each.
const thumbnails: VibePlayerSeekThumbnail[] = [
  {
    endTime: 50,
    sprite: { height: 90, width: 160, x: 0, y: 0 },
    startTime: 0,
    url: "/early.jpg",
  },
  { endTime: 100, startTime: 50, url: "/late.jpg" },
];

afterEach(cleanup);
beforeEach(() => {
  // Every part measures 200 px wide from x = 0.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 200, 20)
  );
  return () => vi.restoreAllMocks();
});

function frame() {
  return document.querySelector<HTMLElement>("[data-part='scrub-frame']");
}

async function play(skin: "chips" | "glass", seekThumbnails = thumbnails) {
  const { adapterFactory } = createStageAdapterFactory();
  render(
    <VibePlayerCompact
      adapterFactory={adapterFactory}
      seekThumbnails={seekThumbnails}
      skin={skin}
      source={stageFileSource}
    />
  );
  // Chips is a lazy chunk; settle its import inside act before querying.
  await act(() => import("./vibe-player-chips-skin"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
  return screen.getByRole("slider", { name: "Seek" });
}

describe("compact scrub frame", () => {
  it("follows the glass pointer with the hovered frame and time", async () => {
    const track = await play("glass");
    const root = frame();
    expect(root?.hasAttribute("data-active")).toBe(false);

    fireEvent.pointerMove(track, { clientX: 50 });
    expect(root?.hasAttribute("data-active")).toBe(true);
    expect(root).toHaveTextContent("0:25");
    expect(root?.querySelector("img")?.getAttribute("src")).toBe("/early.jpg");

    fireEvent.pointerMove(track, { clientX: 150 });
    expect(root).toHaveTextContent("1:15");
    expect(root?.querySelector("img")?.getAttribute("src")).toBe("/late.jpg");

    fireEvent.pointerLeave(track);
    expect(root?.hasAttribute("data-active")).toBe(false);
  });

  it("shows during a chips keyboard seek and ends with its feedback", async () => {
    vi.useFakeTimers();
    try {
      const track = await play("chips");
      fireEvent.keyDown(track, { key: "End" });
      expect(frame()?.hasAttribute("data-active")).toBe(true);
      expect(frame()).toHaveTextContent("1:40");
      await act(() => vi.advanceTimersByTimeAsync(800));
      expect(frame()?.hasAttribute("data-active")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is absent without seek thumbnails", async () => {
    await play("glass", []);
    expect(frame()).toBeNull();
  });
});
