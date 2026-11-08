import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerHeatmap } from "./vibe-player-heatmap";
import {
  createVibePlayerHeatmapLine,
  findVibePlayerHeatmapPeaks,
  sampleVibePlayerHeatmap,
} from "./vibe-player-heatmap-geometry";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

// Slice 2 (the third quarter of a 100 s video) is the only peak.
const values = [0.31, 0.2, 1, 0.4];
const labels = {
  replayValue: (value: number) => `${Math.round(value * 100)}% of viewers`,
};
const sprite = {
  endTime: 70,
  sprite: { height: 90, width: 160, x: 160, y: 90 },
  startTime: 60,
  url: "/sprite.jpg",
};

afterEach(cleanup);
beforeEach(() => {
  // Every timeline part measures 200 px wide from x = 0.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 200, 20)
  );
  return () => vi.restoreAllMocks();
});

function heatmap() {
  return document.querySelector<HTMLElement>("[data-part='heatmap']");
}

async function playGlass() {
  const { adapterFactory } = createStageAdapterFactory();
  render(
    <VibePlayerCompact
      adapterFactory={adapterFactory}
      labels={labels}
      seekThumbnails={[sprite]}
      source={stageFileSource}
      timelineBackground={() => <VibePlayerHeatmap values={values} />}
    />
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
  return screen.getByRole("slider", { name: "Seek" });
}

describe("heatmap geometry", () => {
  it("runs one line through each slice centre, held flat to both edges", () => {
    // Levels 1, 0, 0, 0.5 sit at y = 8 + 92 × (1 − level).
    const line = createVibePlayerHeatmapLine([2, Number.NaN, -1, 0.5]);
    expect(line.startsWith("M0 8 L12.5 8 C")).toBe(true);
    expect(line).toContain(" 37.5 100 C");
    expect(line.endsWith(" 87.5 54 L100 54")).toBe(true);
    expect(createVibePlayerHeatmapLine([0.4])).toBe("");
  });

  it("samples the drawn values at slice centres and holds them at the edges", () => {
    expect(sampleVibePlayerHeatmap(values, 0.625)).toBeCloseTo(1);
    expect(sampleVibePlayerHeatmap(values, 0.875)).toBeCloseTo(0.4);
    expect(sampleVibePlayerHeatmap(values, 0)).toBeCloseTo(0.31);
    expect(sampleVibePlayerHeatmap(values, 1)).toBeCloseTo(0.4);
  });

  it("names at most three peaks above the threshold, never the opening", () => {
    const series = Array.from({ length: 100 }, () => 0.1);
    Object.assign(series, {
      1: 1,
      28: 0.95,
      40: 0.55,
      50: 0.65,
      71: 0.7,
      85: 0.62,
    });
    expect(findVibePlayerHeatmapPeaks(series, 0.6)).toEqual([
      0.285, 0.715, 0.505,
    ]);
  });

  it("renders nothing for fewer than two values", () => {
    const { container } = render(<VibePlayerHeatmap values={[0.4]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("heatmap preview", () => {
  it("is inactive at rest and follows the pointer over the glass track", async () => {
    const track = await playGlass();
    const root = heatmap();
    expect(root?.hasAttribute("data-active")).toBe(false);

    fireEvent.pointerMove(track, { clientX: 125 });
    expect(root?.hasAttribute("data-active")).toBe(true);
    expect(root).toHaveTextContent("1:02Most replayed");
    // 62.5 s falls in the 60–70 s sprite tile.
    expect(root?.querySelector("img")?.getAttribute("src")).toBe("/sprite.jpg");

    fireEvent.pointerMove(track, { clientX: 10 });
    expect(root).toHaveTextContent("0:0531% of viewers");

    fireEvent.pointerLeave(track);
    expect(root?.hasAttribute("data-active")).toBe(false);
  });

  it("follows a keyboard seek until its feedback ends", async () => {
    vi.useFakeTimers();
    try {
      const track = await playGlass();
      fireEvent.keyDown(track, { key: "End" });
      expect(heatmap()?.hasAttribute("data-active")).toBe(true);
      expect(heatmap()).toHaveTextContent("1:4040% of viewers");
      await act(() => vi.advanceTimersByTimeAsync(800));
      expect(heatmap()?.hasAttribute("data-active")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("follows hover on the full-stage timeline", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        load="eager"
        source={stageFileSource}
        timelineBackground={() => (
          <VibePlayerHeatmap values={values} variant="curve" />
        )}
      />
    );
    const timeline = await screen.findByRole("slider", { name: "Seek" });
    const root = timeline.closest<HTMLElement>("[data-vibe-player-timeline]");
    if (!root) {
      throw new Error("Missing timeline");
    }
    fireEvent.pointerMove(root, { clientX: 50 });
    expect(heatmap()?.dataset.variant).toBe("curve");
    expect(heatmap()?.hasAttribute("data-active")).toBe(true);
    expect(heatmap()).toHaveTextContent("0:25");
    fireEvent.pointerLeave(root);
    expect(heatmap()?.hasAttribute("data-active")).toBe(false);
  });
});
