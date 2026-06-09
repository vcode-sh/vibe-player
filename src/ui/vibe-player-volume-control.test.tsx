import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createIdleCapabilities,
  createIdleSnapshot,
  type VibePlayerSnapshot,
} from "../core";
import { VibePlayerVolumeControl } from "./vibe-player-volume-control";

const capabilities = {
  ...createIdleCapabilities(),
  supportsMute: true,
  supportsVolumeControl: true,
};

const snapshot: VibePlayerSnapshot = {
  ...createIdleSnapshot(),
  currentTime: 25,
  duration: 100,
  muted: false,
  paused: true,
  readyState: "ready",
  volume: 0.42,
};

function getVolumeRoot(button: HTMLElement): HTMLElement {
  const root = button.closest(".vibe-player-volume-control");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Missing volume control root");
  }
  return root;
}

describe("VibePlayerVolumeControl", () => {
  it("unmutes when volume is raised from muted state", () => {
    const onSetMuted = vi.fn();
    const onSetVolume = vi.fn();

    render(
      <VibePlayerVolumeControl
        capabilities={capabilities}
        onSetMuted={onSetMuted}
        onSetVolume={onSetVolume}
        onToggleMute={vi.fn()}
        snapshot={{ ...snapshot, muted: true, volume: 0.2 }}
      />
    );

    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "Unmute, volume 20%" })
    );
    fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), {
      key: "ArrowUp",
    });

    expect(onSetVolume).toHaveBeenCalledWith(0.25);
    expect(onSetMuted).toHaveBeenCalledWith(false);
  });

  it("auto-dismisses the volume popover after inactivity", () => {
    vi.useFakeTimers();
    try {
      render(
        <VibePlayerVolumeControl
          capabilities={capabilities}
          onSetMuted={vi.fn()}
          onSetVolume={vi.fn()}
          onToggleMute={vi.fn()}
          snapshot={snapshot}
        />
      );

      const volumeButton = screen.getByRole("button", {
        name: "Mute, volume 42%",
      });
      const volumeRoot = getVolumeRoot(volumeButton);
      fireEvent.mouseEnter(volumeButton);
      expect(
        screen.getByRole("dialog", { name: "Volume" })
      ).toBeInTheDocument();
      expect(screen.queryByRole("tooltip", { name: "Mute M" })).toBeNull();

      act(() => vi.advanceTimersByTime(1200));
      expect(
        screen.getByRole("dialog", { name: "Volume" })
      ).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), {
        key: "ArrowUp",
      });
      act(() => vi.advanceTimersByTime(650));
      expect(
        screen.getByRole("dialog", { name: "Volume" })
      ).toBeInTheDocument();

      fireEvent.mouseLeave(volumeRoot);
      act(() => vi.advanceTimersByTime(500));
      expect(
        screen.getByRole("dialog", { name: "Volume" })
      ).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(20));
      expect(screen.queryByRole("dialog", { name: "Volume" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
