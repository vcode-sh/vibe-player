import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createIdleCapabilities } from "../core";
import { VibePlayerQualityControl } from "./vibe-player-quality-control";

it("navigates quality choices from the selection, wraps, and commits with keyboard focus restored", () => {
  vi.useFakeTimers();
  try {
    const onSetQuality = vi.fn();
    render(
      <VibePlayerQualityControl
        capabilities={{
          ...createIdleCapabilities(),
          supportsQualitySelection: true,
        }}
        onSetQuality={onSetQuality}
        qualityOptions={[
          { auto: true, id: "auto", label: "Auto", selected: false },
          { auto: false, id: "720", label: "720p", selected: true },
          { auto: false, id: "1080", label: "1080p", selected: false },
        ]}
      />
    );
    const trigger = screen.getByRole("button", { name: "Quality 720p" });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    act(() => vi.runOnlyPendingTimers());
    const selected = screen.getByRole("option", { selected: true });
    const first = screen.getByRole("option", { name: "Auto Adaptive" });
    const last = screen.getByRole("option", { name: "1080p Manual" });
    expect(selected).toHaveFocus();
    expect(selected).toHaveTextContent("720p");
    fireEvent.keyDown(selected, { key: "ArrowDown" });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "ArrowDown" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Home" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "End" });
    expect(last).toHaveFocus();
    expect(onSetQuality).not.toHaveBeenCalled();
    fireEvent.keyDown(last, { key: "Enter" });
    expect(onSetQuality.mock.calls).toEqual([["1080"]]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  } finally {
    cleanup();
    vi.useRealTimers();
  }
});
