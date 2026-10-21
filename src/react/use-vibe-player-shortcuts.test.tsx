import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVibePlayerShortcuts } from "./use-vibe-player-shortcuts";

describe("useVibePlayerShortcuts", () => {
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
});
