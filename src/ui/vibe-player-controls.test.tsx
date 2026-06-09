import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createIdleCapabilities, createIdleSnapshot } from "../core";
import { VibePlayerControls } from "./vibe-player-controls";

const capabilities = {
  ...createIdleCapabilities(),
  canFullscreen: true,
  canPictureInPicture: true,
  canSeek: true,
  canSetPlaybackRate: true,
  canShowCaptions: true,
  supportsDuration: true,
  supportsMute: true,
  supportsPlayback: true,
  supportsQualitySelection: true,
};

const snapshot = {
  ...createIdleSnapshot(),
  currentTime: 25,
  duration: 100,
  muted: false,
  paused: true,
  playbackRate: 1,
  qualityOptions: [
    { auto: true, id: "auto", label: "Auto", selected: true },
    { auto: false, height: 720, id: "level:0", label: "720p", selected: false },
    {
      auto: false,
      height: 1080,
      id: "level:1",
      label: "1080p",
      selected: false,
    },
  ],
};

describe("VibePlayerControls", () => {
  it("renders capability-aware controls and forwards actions", () => {
    const onTogglePlay = vi.fn();
    const onToggleMute = vi.fn();
    const onSetPlaybackRate = vi.fn();
    const onSetQuality = vi.fn();
    const onToggleCaptions = vi.fn();
    const onToggleFullscreen = vi.fn();
    const onTogglePictureInPicture = vi.fn();
    const onSeek = vi.fn();

    render(
      <VibePlayerControls
        capabilities={capabilities}
        captionsEnabled={false}
        onSeek={onSeek}
        onSetPlaybackRate={onSetPlaybackRate}
        onSetQuality={onSetQuality}
        onToggleCaptions={onToggleCaptions}
        onToggleFullscreen={onToggleFullscreen}
        onToggleMute={onToggleMute}
        onTogglePictureInPicture={onTogglePictureInPicture}
        onTogglePlay={onTogglePlay}
        snapshot={snapshot}
        title="Product demo"
        topActions={<a href="https://example.com/source">Watch source</a>}
      />
    );

    expect(screen.getByText("Product demo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Watch source" })).toHaveAttribute(
      "href",
      "https://example.com/source"
    );
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute(
      "title",
      "Play"
    );
    expect(
      screen.getByRole("button", { name: "Picture in picture" })
    ).toHaveAttribute("title", "Picture in picture");
    expect(
      screen
        .getByRole("button", { name: "Picture in picture" })
        .querySelector("svg")
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    fireEvent.click(screen.getByRole("button", { name: "Playback speed 1x" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Quality" }), {
      target: { value: "level:1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Show captions" }));
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    fireEvent.click(screen.getByRole("button", { name: "Picture in picture" }));

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    expect(onSetPlaybackRate).toHaveBeenCalledWith(1.25);
    expect(onSetQuality).toHaveBeenCalledWith("level:1");
    expect(onToggleCaptions).toHaveBeenCalledTimes(1);
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
    expect(onTogglePictureInPicture).toHaveBeenCalledTimes(1);
  });

  it("hides unsupported optional controls", () => {
    render(
      <VibePlayerControls
        capabilities={createIdleCapabilities()}
        onSeek={vi.fn()}
        onSetPlaybackRate={vi.fn()}
        onToggleMute={vi.fn()}
        onTogglePlay={vi.fn()}
        snapshot={snapshot}
      />
    );

    expect(screen.queryByRole("button", { name: "Mute" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Full screen" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Picture in picture" })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Show captions" })).toBeNull();
  });

  it("hides playback chrome for non-playable handoff surfaces", () => {
    render(
      <VibePlayerControls
        capabilities={createIdleCapabilities()}
        onSeek={vi.fn()}
        onSetPlaybackRate={vi.fn()}
        onToggleMute={vi.fn()}
        onTogglePlay={vi.fn()}
        snapshot={snapshot}
        title="External video"
        topActions={<a href="https://youtube.com/watch?v=demo">Open</a>}
      />
    );

    expect(screen.getByText("External video")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
  });
});
