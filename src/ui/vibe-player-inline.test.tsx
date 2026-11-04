import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core";
import { VibePlayerInline } from "./vibe-player-inline";
import {
  createStageAdapterFactory,
  getStageAdapter,
} from "./vibe-player-stage-test-helpers";

const fileSource: VibePlayerFileSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "https://example.com/captions.vtt",
    },
  ],
  id: "file-video",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  title: "Inline demo",
  type: "file",
};

describe("VibePlayerInline", () => {
  it("connects caption controls and releases playback when its source is removed", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.capabilities.canShowCaptions = true;
        adapter.setSnapshot({ ...adapter.getSnapshot(), currentTime: 1.5 });
      },
    });
    const loadCaptionText = vi.fn(() =>
      Promise.resolve(`WEBVTT

00:00:01.000 --> 00:00:02.000
Caption line`)
    );

    const { rerender } = render(
      <VibePlayerInline
        adapterFactory={adapterFactory}
        loadCaptionText={loadCaptionText}
        source={fileSource}
      />
    );

    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("load:file-video")
    );
    await waitFor(() =>
      expect(screen.getByText("Caption line")).toBeInTheDocument()
    );

    expect(getStageAdapter(adapters).calls).not.toContain("play");
    fireEvent.click(screen.getByRole("button", { name: "Hide captions" }));
    expect(screen.queryByText("Caption line")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show captions" }));
    await waitFor(() =>
      expect(screen.getByText("Caption line")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    fireEvent.click(screen.getByRole("button", { name: "Playback speed 1x" }));
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));

    expect(getStageAdapter(adapters).calls).toEqual(
      expect.arrayContaining(["play", "muted:true", "rate:1.25", "fullscreen"])
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    rerender(
      <VibePlayerInline adapterFactory={adapterFactory}>
        Choose a video
      </VibePlayerInline>
    );
    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("unmount")
    );
    expect(screen.getByText("Choose a video")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(screen.queryByText("Caption line")).toBeNull();
  });
});
