import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createIdleCapabilities, createIdleSnapshot } from "../core";
import { VibePlayerVolumeControl } from "./vibe-player-volume-control";

describe("volume pointer ownership", () => {
  it.each(["overlay", "outside"] as const)(
    "only commits the primary captured drag in %s presentation",
    (controlsPresentation) => {
      const onSetVolume = vi.fn();
      render(
        <VibePlayerVolumeControl
          capabilities={{
            ...createIdleCapabilities(),
            controlsPresentation,
            supportsMute: true,
            supportsVolumeControl: true,
          }}
          onSetMuted={vi.fn()}
          onSetVolume={onSetVolume}
          onToggleMute={vi.fn()}
          snapshot={{ ...createIdleSnapshot(), volume: 0.42 }}
        />
      );
      act(() => screen.getByRole("button").focus());
      const slider = screen.getByRole("slider", { name: "Volume" });
      slider.getBoundingClientRect = () => new DOMRect(10, 20, 200, 100);
      slider.setPointerCapture = vi.fn();
      slider.hasPointerCapture = () => true;
      slider.releasePointerCapture = vi.fn();
      const start = { clientX: 60, clientY: 95, isPrimary: true, pointerId: 1 };
      fireEvent.pointerDown(slider, { ...start, button: 2 });
      expect(onSetVolume).not.toHaveBeenCalled();
      fireEvent.pointerDown(slider, { ...start, button: 0 });
      expect(onSetVolume.mock.calls).toEqual([[0.25]]);

      fireEvent.pointerMove(slider, {
        clientX: 190,
        clientY: 30,
        pointerId: 2,
      });
      fireEvent.pointerUp(slider, { pointerId: 2 });
      expect(onSetVolume.mock.calls).toEqual([[0.25]]);
      fireEvent.pointerMove(slider, {
        clientX: 160,
        clientY: 45,
        pointerId: 1,
      });
      expect(onSetVolume.mock.calls).toEqual([[0.25], [0.75]]);
      fireEvent.lostPointerCapture(slider, { pointerId: 1 });
      fireEvent.pointerMove(slider, {
        clientX: 210,
        clientY: 20,
        pointerId: 1,
      });
      expect(onSetVolume.mock.calls).toEqual([[0.25], [0.75]]);
    }
  );
});
