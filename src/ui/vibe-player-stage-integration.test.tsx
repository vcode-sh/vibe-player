import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core";
import { VibePlayerInline } from "./vibe-player-inline";
import { VibePlayerModal } from "./vibe-player-modal";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

const captionedSource: VibePlayerFileSource = {
  ...stageFileSource,
  captions: [
    {
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/en.vtt",
    },
  ],
};

describe("package player integration", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps loaded captions when an equivalent source is reconstructed", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) =>
        adapter.setSnapshot({ ...adapter.getSnapshot(), currentTime: 1.5 }),
    });
    const loadCaptionText = vi.fn(
      async () => "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nKeep this caption"
    );
    const { rerender } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        loadCaptionText={loadCaptionText}
        source={captionedSource}
      />
    );
    await waitFor(() =>
      expect(screen.getByText("Keep this caption")).toBeVisible()
    );

    rerender(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        loadCaptionText={loadCaptionText}
        source={{
          ...captionedSource,
          captions:
            captionedSource.captions?.map((track) => ({ ...track })) ?? [],
        }}
      />
    );

    expect(screen.getByText("Keep this caption")).toBeVisible();
    expect(loadCaptionText).toHaveBeenCalledTimes(1);
    expect(adapters).toHaveLength(1);
  });

  it.each(["inline", "modal"] as const)(
    "exposes autoplay, actions and state observation through %s",
    async (layout) => {
      const { adapterFactory, adapters } = createStageAdapterFactory();
      const onStateChange = vi.fn();
      const props = {
        adapterFactory,
        autoPlay: true,
        autoPlayMutedBootstrap: false,
        onStateChange,
        source: stageFileSource,
        topActions: <button type="button">Save video</button>,
      };
      render(
        layout === "inline" ? (
          <VibePlayerInline {...props} />
        ) : (
          <VibePlayerModal {...props} open />
        )
      );

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
      );
      expect(screen.getByRole("button", { name: "Save video" })).toBeVisible();
      expect(getStageAdapter(adapters).calls).not.toContain("muted:true");
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentSource: stageFileSource,
          snapshot: expect.objectContaining({ paused: false }),
        })
      );
    }
  );

  it("reports command failure to the latest error callback without replacing playback infrastructure", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const previous = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onError={previous}
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("load:stage-video")
    );
    rerender(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onError={latest}
        source={stageFileSource}
      />
    );
    getStageAdapter(adapters).playError = new Error("Decoder refused playback");
    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() =>
      expect(latest).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Decoder refused playback",
          phase: "playback",
          sourceId: "stage-video",
        })
      )
    );
    expect(previous).not.toHaveBeenCalled();
    expect(adapters).toHaveLength(1);
  });

  it("obeys normalized visibility requirements even for a custom file adapter", async () => {
    vi.useFakeTimers();
    const { adapterFactory } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.capabilities.keepsControlsVisible = true;
      },
    });
    await act(async () => {
      render(
        <VibePlayerStage
          adapterFactory={adapterFactory}
          source={stageFileSource}
        />
      );
    });
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
  });

  it("supports StrictMode ref replay and still plays the mounted source", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const { unmount } = render(
      <StrictMode>
        <VibePlayerStage
          adapterFactory={adapterFactory}
          source={stageFileSource}
        />
      </StrictMode>
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play" })).toBeVisible()
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    unmount();
    for (const adapter of adapters) {
      expect(adapter.calls).toContain("unmount");
    }
  });
});
