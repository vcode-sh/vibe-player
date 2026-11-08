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
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";
import type { VibePlayerCompactControls } from "./vibe-player-surface-types";

afterEach(cleanup);

function renderGlass(centerButton?: VibePlayerCompactControls["centerButton"]) {
  const harness = createStageAdapterFactory();
  const view = render(
    <VibePlayerCompact
      adapterFactory={harness.adapterFactory}
      controls={centerButton ? { centerButton } : undefined}
      source={stageFileSource}
    />
  );
  const center = () =>
    view.container.querySelector('[data-part="play-button"]');
  return { center, view };
}

async function playThenPause() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
  });
}

describe("glass centre button", () => {
  it("shows while paused by default, beside the capsule", async () => {
    const { center, view } = renderGlass();
    await playThenPause();
    const root = view.container.querySelector(".vibe-player-compact");
    expect(root).toHaveAttribute("data-state", "paused");
    expect(center()).toHaveAttribute("data-visible", "true");
  });

  it('"except-paused" leaves Play to the capsule while paused only', async () => {
    const { center, view } = renderGlass("except-paused");
    expect(center()).toHaveAttribute("data-visible", "true");
    await playThenPause();
    const root = view.container.querySelector(".vibe-player-compact");
    expect(root).toHaveAttribute("data-state", "paused");
    expect(center()).toHaveAttribute("data-visible", "false");
    const capsule = view.container.querySelector('[data-part="controls"]');
    expect(capsule).toHaveAttribute("data-visible", "true");
    expect(capsule?.querySelector('[data-part="toggle"]')).toHaveAccessibleName(
      "Play"
    );
  });
});
