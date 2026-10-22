import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

const muteLabel = /mute/i;
const seekLabel = /seek/i;

// Shared UI branches only on the normalized presentation capability; adapter
// tests own which provider configuration selects it.
describe("VibePlayerStage controls presentation", () => {
  it("leaves playback controls to a provider while keeping host chrome and commands", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.capabilities.controlsPresentation = "provider";
        adapter.capabilities.keepsControlsVisible = true;
      },
    });
    const { container } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onClose={vi.fn()}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("load:stage-video")
    );
    expect(screen.getByText("Stage demo")).toBeVisible();
    expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: muteLabel })).toBeNull();

    const root = container.querySelector(".vibe-player-stage");
    if (!(root instanceof HTMLElement)) {
      throw new Error("Expected the stage root.");
    }
    fireEvent.keyDown(root, { key: "k" });
    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("play")
    );
  });

  it("renders exactly one package playback bar for outside presentation", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.capabilities.controlsPresentation = "outside";
        adapter.capabilities.keepsControlsVisible = true;
      },
    });
    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play" })).toBeVisible()
    );
    expect(screen.getAllByRole("button", { name: "Play" })).toHaveLength(1);
    expect(screen.getAllByRole("slider", { name: seekLabel })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("play")
    );
  });
});
