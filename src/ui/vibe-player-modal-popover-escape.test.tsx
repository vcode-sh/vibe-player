import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createIdleCapabilities, createIdleSnapshot } from "../core";
import { VibePlayerModal } from "./vibe-player-modal";
import { VibePlayerQualityControl } from "./vibe-player-quality-control";
import { VibePlayerVolumeControl } from "./vibe-player-volume-control";

describe("modal popover Escape priority", () => {
  it("closes volume first and lets a second Escape dismiss the modal", () => {
    const onClose = vi.fn();
    render(
      <VibePlayerModal onClose={onClose} open>
        <button type="button">Player action</button>
        <VibePlayerVolumeControl
          capabilities={{
            ...createIdleCapabilities(),
            supportsMute: true,
            supportsVolumeControl: true,
          }}
          onSetMuted={vi.fn()}
          onSetVolume={vi.fn()}
          onToggleMute={vi.fn()}
          snapshot={{ ...createIdleSnapshot(), muted: false, volume: 0.42 }}
        />
      </VibePlayerModal>
    );
    const trigger = screen.getByRole("button", { name: "Mute, volume 42%" });
    act(() => trigger.focus());
    const slider = screen.getByRole("slider", { name: "Volume" });
    act(() => slider.focus());

    fireEvent.keyDown(slider, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Volume" })).toBeNull();
    expect(trigger).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes click-opened quality from its trigger before dismissing the modal", () => {
    const onClose = vi.fn();
    render(
      <VibePlayerModal onClose={onClose} open>
        <VibePlayerQualityControl
          capabilities={{
            ...createIdleCapabilities(),
            supportsQualitySelection: true,
          }}
          onSetQuality={vi.fn()}
          qualityOptions={[
            { auto: true, id: "auto", label: "Auto", selected: true },
            {
              auto: false,
              height: 720,
              id: "720",
              label: "720p",
              selected: false,
            },
          ]}
        />
      </VibePlayerModal>
    );
    const trigger = screen.getByRole("button", { name: "Quality Auto" });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    expect(
      screen.getByRole("listbox", { name: "Quality" })
    ).toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Quality" })).toBeNull();
    expect(trigger).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
