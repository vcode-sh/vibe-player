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
  it.each([
    {
      expected: 0.25,
      key: "ArrowUp",
      shiftKey: false,
      unmute: true,
      volume: 0.2,
    },
    {
      expected: 1,
      key: "ArrowUp",
      shiftKey: false,
      unmute: true,
      volume: 0.98,
    },
    {
      expected: 0,
      key: "ArrowDown",
      shiftKey: false,
      unmute: false,
      volume: 0.02,
    },
    {
      expected: 0.3,
      key: "ArrowUp",
      shiftKey: true,
      unmute: true,
      volume: 0.2,
    },
  ])(
    "commits $expected for $key from $volume, shift=$shiftKey without unmuting zero",
    ({ expected, key, shiftKey, unmute, volume }) => {
      const onSetMuted = vi.fn();
      const onSetVolume = vi.fn();

      render(
        <VibePlayerVolumeControl
          capabilities={capabilities}
          onSetMuted={onSetMuted}
          onSetVolume={onSetVolume}
          onToggleMute={vi.fn()}
          snapshot={{ ...snapshot, muted: true, volume }}
        />
      );

      fireEvent.mouseEnter(screen.getByRole("button"));
      fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), {
        key,
        shiftKey,
      });

      expect(onSetVolume.mock.calls).toEqual([[expected]]);
      if (unmute) {
        expect(onSetMuted.mock.calls).toEqual([[false]]);
      } else {
        expect(onSetMuted).not.toHaveBeenCalled();
      }
    }
  );

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
      act(() => vi.advanceTimersByTime(519));
      expect(
        screen.getByRole("dialog", { name: "Volume" })
      ).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByRole("dialog", { name: "Volume" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
