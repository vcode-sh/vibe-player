import { describe, expect, it } from "vitest";
import type { VibePlayerShortcutInput } from "./vibe-player-shortcuts";
import { getVibePlayerShortcutAction } from "./vibe-player-shortcuts";

const baseInput: VibePlayerShortcutInput = {
  altKey: false,
  code: "",
  ctrlKey: false,
  key: "",
  metaKey: false,
  shiftKey: false,
  targetIsContentEditable: false,
  targetTagName: null,
};

const enabledOptions = {
  canFullscreen: true,
  canSeek: true,
  canShowCaptions: true,
  supportsMute: true,
};

describe("getVibePlayerShortcutAction", () => {
  it("maps playback keyboard shortcuts", () => {
    expect(
      getVibePlayerShortcutAction(
        { ...baseInput, code: "Space", key: " " },
        enabledOptions
      )
    ).toBe("toggle-play");
    expect(
      getVibePlayerShortcutAction({ ...baseInput, key: "m" }, enabledOptions)
    ).toBe("toggle-mute");
    expect(
      getVibePlayerShortcutAction(
        { ...baseInput, key: "ArrowRight" },
        enabledOptions
      )
    ).toBe("seek-forward");
  });

  it("respects capabilities and interactive targets", () => {
    expect(
      getVibePlayerShortcutAction(
        { ...baseInput, key: "c" },
        { ...enabledOptions, canShowCaptions: false }
      )
    ).toBeNull();
    expect(
      getVibePlayerShortcutAction(
        { ...baseInput, key: "k", targetTagName: "button" },
        enabledOptions
      )
    ).toBeNull();
    expect(
      getVibePlayerShortcutAction(
        { ...baseInput, key: "k", metaKey: true },
        enabledOptions
      )
    ).toBeNull();
  });
});
