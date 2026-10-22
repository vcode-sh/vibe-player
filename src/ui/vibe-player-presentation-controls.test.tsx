import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createIdleCapabilities, createIdleSnapshot } from "../core";
import { VibePlayerControls } from "./vibe-player-controls";

const capabilities = {
  ...createIdleCapabilities(),
  canFullscreen: true,
  canPictureInPicture: true,
  canSetPlaybackRate: true,
  supportsPlayback: true,
};

function createActions() {
  return {
    onSeek: vi.fn(),
    onSetPlaybackRate: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleMute: vi.fn(),
    onTogglePictureInPicture: vi.fn(),
    onTogglePlay: vi.fn(),
  };
}

describe("normalized presentation controls", () => {
  it("offers exit actions for active fullscreen and picture-in-picture", () => {
    const actions = createActions();
    render(
      <VibePlayerControls
        {...actions}
        capabilities={capabilities}
        snapshot={{
          ...createIdleSnapshot(),
          isFullscreen: true,
          isPictureInPicture: true,
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Exit full screen" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Exit picture in picture" })
    );
    expect(actions.onToggleFullscreen).toHaveBeenCalledOnce();
    expect(actions.onTogglePictureInPicture).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Full screen" })).toBeNull();
  });

  it("cycles through normalized provider rates instead of unsupported defaults", () => {
    const actions = createActions();
    render(
      <VibePlayerControls
        {...actions}
        capabilities={capabilities}
        snapshot={{
          ...createIdleSnapshot(),
          playbackRate: 1,
          playbackRates: [1, 1.5, 2],
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Playback speed 1x" }));
    expect(actions.onSetPlaybackRate).toHaveBeenCalledWith(1.5);
  });
});
