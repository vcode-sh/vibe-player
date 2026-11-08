import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import {
  createVibePlayerHeatmapPath,
  VibePlayerHeatmap,
} from "./vibe-player-heatmap";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";
import type { VibePlayerTimelineBackgroundContext } from "./vibe-player-ui-context";

afterEach(cleanup);

function background({ duration }: VibePlayerTimelineBackgroundContext) {
  return <span data-testid="background">{`over ${duration}s`}</span>;
}

async function playCompact(skin: "chips" | "glass") {
  const { adapterFactory } = createStageAdapterFactory();
  render(
    <VibePlayerCompact
      adapterFactory={adapterFactory}
      skin={skin}
      source={stageFileSource}
      timelineBackground={background}
    />
  );
  // Chips is a lazy chunk; settle its import inside act before querying.
  await act(() => import("./vibe-player-chips-skin"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
}

/** The layer must precede the rail, whose fill then paints over it. */
function expectUnderFill(layer: Element | null, rail: string) {
  expect(layer?.getAttribute("aria-hidden")).toBe("true");
  expect(layer?.nextElementSibling?.matches(rail)).toBe(true);
}

describe("timeline background", () => {
  it("draws under the glass and chips fills with the media duration", async () => {
    await playCompact("glass");
    const glass = await screen.findByTestId("background");
    expect(glass).toHaveTextContent("over 100s");
    expectUnderFill(glass.parentElement, ".vibe-player-scrubber__rail");
    cleanup();

    await playCompact("chips");
    const chips = await screen.findByTestId("background");
    expectUnderFill(chips.parentElement, ".vibe-player-scrubber__rail");
  });

  it("draws under the full-stage progress", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        load="eager"
        source={stageFileSource}
        timelineBackground={background}
      />
    );
    const layer = (await screen.findByTestId("background")).parentElement;
    expect(layer).toHaveTextContent("over 100s");
    expectUnderFill(layer, ".vibe-player-timeline__progress");
  });

  it("renders nothing extra without a background", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    });
    expect(
      container.querySelector("[data-part='timeline-background']")
    ).toBeNull();
  });
});

describe("heatmap", () => {
  it("spans the full width and clamps intensity to the graph", () => {
    const path = createVibePlayerHeatmapPath([2, Number.NaN, -1, 0.5]);
    // Starts at the bottom-left edge, held at the first value (clamped to 1).
    expect(path.startsWith("M0 100 L0 0 L125 0")).toBe(true);
    // Ends held at the last value (0.5) to the right edge, then closes.
    expect(path.endsWith("L875 50 L1000 50 L1000 100Z")).toBe(true);
    // NaN and negative slices sit on the baseline.
    expect(path).toContain("Q375 100");
  });

  it("renders no graph for fewer than two slices", () => {
    const { container } = render(<VibePlayerHeatmap values={[0.4]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
