import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVibePlayerShortcuts } from "./use-vibe-player-shortcuts";

describe("useVibePlayerShortcuts", () => {
  afterEach(() => vi.restoreAllMocks());
  it("binds keyboard shortcuts to a supplied target", () => {
    const target = document.createElement("div");
    const onShortcut = vi.fn();
    const { unmount } = renderHook(() =>
      useVibePlayerShortcuts({
        canFullscreen: true,
        canSeek: true,
        canShowCaptions: true,
        enabled: true,
        onShortcut,
        supportsMute: true,
        target,
      })
    );

    target.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    expect(onShortcut).toHaveBeenCalledWith("toggle-mute");

    unmount();
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(onShortcut).toHaveBeenCalledTimes(1);
  });

  it("uses current capabilities and callbacks without rebinding the target", () => {
    const target = document.createElement("div");
    const addListener = vi.spyOn(target, "addEventListener");
    const initialCallback = vi.fn();
    const currentCallback = vi.fn();
    const { rerender } = renderHook(
      ({ onShortcut, supportsMute }) =>
        useVibePlayerShortcuts({
          canFullscreen: true,
          canSeek: true,
          canShowCaptions: true,
          enabled: true,
          onShortcut,
          supportsMute,
          target,
        }),
      { initialProps: { onShortcut: initialCallback, supportsMute: true } }
    );

    rerender({ onShortcut: currentCallback, supportsMute: false });
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));

    expect(initialCallback).not.toHaveBeenCalled();
    expect(currentCallback).toHaveBeenCalledExactlyOnceWith("toggle-play");
    expect(addListener).toHaveBeenCalledTimes(1);
  });

  it("moves keyboard ownership to the new target and releases it when disabled", () => {
    const firstTarget = document.createElement("div");
    const secondTarget = document.createElement("div");
    const onShortcut = vi.fn();
    const { rerender } = renderHook(
      ({ enabled, target }) =>
        useVibePlayerShortcuts({
          canFullscreen: true,
          canSeek: true,
          canShowCaptions: true,
          enabled,
          onShortcut,
          supportsMute: true,
          target,
        }),
      { initialProps: { enabled: true, target: firstTarget } }
    );
    rerender({ enabled: true, target: secondTarget });
    const oldEvent = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "k",
    });
    firstTarget.dispatchEvent(oldEvent);
    expect(oldEvent.defaultPrevented).toBe(false);
    expect(onShortcut).not.toHaveBeenCalled();

    const currentEvent = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "k",
    });
    secondTarget.dispatchEvent(currentEvent);
    expect(currentEvent.defaultPrevented).toBe(true);
    expect(onShortcut).toHaveBeenCalledExactlyOnceWith("toggle-play");

    rerender({ enabled: false, target: secondTarget });
    const disabledEvent = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "m",
    });
    secondTarget.dispatchEvent(disabledEvent);
    expect(disabledEvent.defaultPrevented).toBe(false);
    expect(onShortcut).toHaveBeenCalledTimes(1);
  });
});
