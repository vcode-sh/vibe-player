import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createBlockedPlaybackError,
  createStageAdapterFactory,
  getStageAdapter,
  getStageMediaElement,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

describe("VibePlayerStage", () => {
  it("autoplays on open and toggles playback from the media surface", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();

    const { container } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        onClose={vi.fn()}
        open={true}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("play")
    );
    expect(container.querySelector(".vibe-player-stage")).toBe(
      document.activeElement
    );

    fireEvent.click(getStageMediaElement(container));

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("pause")
    );
  });

  it("clears the active source when closed", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();

    const { rerender } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        open={true}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("play")
    );

    rerender(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        open={false}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("unmount")
    );
  });

  it("shows a blocked playback status after rejected autoplay", async () => {
    const { adapterFactory } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.playError = createBlockedPlaybackError();
      },
    });

    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        open={true}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Play to start")
    );
  });

  it("shows an unavailable status after failed source load", async () => {
    const { adapterFactory } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.loadError = new Error("Provider failed");
      },
    });

    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        open={true}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Playback unavailable"
      )
    );
  });

  it("forwards picture-in-picture control actions", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();

    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        open={true}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("load:stage-video")
    );
    fireEvent.click(screen.getByRole("button", { name: "Picture in picture" }));

    expect(getStageAdapter(adapters).calls).toContain("pip");
  });

  it("resumes playback when unmuting a playing source", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.setSnapshot({
          ...adapter.getSnapshot(),
          muted: true,
          paused: false,
          readyState: "playing",
        });
      },
    });

    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        open={true}
        source={stageFileSource}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Unmute" })).toBeVisible()
    );
    fireEvent.click(screen.getByRole("button", { name: "Unmute" }));

    const calls = getStageAdapter(adapters).calls;
    expect(calls).toContain("muted:false");
    expect(calls.at(-1)).toBe("play");
  });
});
