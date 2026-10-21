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
  it.each([
    [" ", "toggle-play"],
    ["K", "toggle-play"],
    ["m", "toggle-mute"],
    ["c", "toggle-captions"],
    ["f", "fullscreen"],
    ["ArrowLeft", "seek-backward"],
    ["ArrowRight", "seek-forward"],
    ["Escape", null],
  ])("maps %s to the documented action", (key, expected) => {
    expect(
      getVibePlayerShortcutAction({ ...baseInput, key }, enabledOptions)
    ).toBe(expected);
  });

  it.each([
    ["m", "supportsMute"],
    ["c", "canShowCaptions"],
    ["f", "canFullscreen"],
    ["ArrowLeft", "canSeek"],
    ["ArrowRight", "canSeek"],
  ] as const)(
    "gates %s on %s without blocking unrelated playback",
    (key, capability) => {
      const options = { ...enabledOptions, [capability]: false };
      expect(
        getVibePlayerShortcutAction({ ...baseInput, key }, options)
      ).toBeNull();
      expect(
        getVibePlayerShortcutAction({ ...baseInput, key: "k" }, options)
      ).toBe("toggle-play");
    }
  );

  it("leaves interactive targets and modified keys to their native actions", () => {
    for (const targetTagName of [
      "BUTTON",
      "input",
      "textarea",
      "select",
      "a",
    ]) {
      expect(
        getVibePlayerShortcutAction(
          { ...baseInput, key: "k", targetTagName },
          enabledOptions
        )
      ).toBeNull();
    }
    for (const flag of [
      "altKey",
      "ctrlKey",
      "metaKey",
      "shiftKey",
      "targetIsContentEditable",
    ] as const) {
      expect(
        getVibePlayerShortcutAction(
          { ...baseInput, [flag]: true, key: "k" },
          enabledOptions
        )
      ).toBeNull();
    }
    expect(
      getVibePlayerShortcutAction(
        { ...baseInput, code: "Space", targetTagName: "div" },
        enabledOptions
      )
    ).toBe("toggle-play");
  });
});
