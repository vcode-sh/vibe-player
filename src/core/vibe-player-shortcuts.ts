export type VibePlayerShortcutAction =
  | "fullscreen"
  | "seek-backward"
  | "seek-forward"
  | "toggle-captions"
  | "toggle-mute"
  | "toggle-play";

export interface VibePlayerShortcutInput {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  targetIsContentEditable: boolean;
  targetTagName: string | null;
}

export interface VibePlayerShortcutOptions {
  canFullscreen: boolean;
  canSeek: boolean;
  canShowCaptions: boolean;
  supportsMute: boolean;
}

const ignoredTargetTags = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
]);

function hasModifier(input: VibePlayerShortcutInput): boolean {
  return input.altKey || input.ctrlKey || input.metaKey || input.shiftKey;
}

function isInteractiveTarget(input: VibePlayerShortcutInput): boolean {
  if (input.targetIsContentEditable) {
    return true;
  }
  if (!input.targetTagName) {
    return false;
  }
  return ignoredTargetTags.has(input.targetTagName.toLowerCase());
}

export function getVibePlayerShortcutAction(
  input: VibePlayerShortcutInput,
  options: VibePlayerShortcutOptions
): VibePlayerShortcutAction | null {
  if (hasModifier(input) || isInteractiveTarget(input)) {
    return null;
  }

  const key = input.key.toLowerCase();
  if (input.code === "Space" || input.key === " " || key === "k") {
    return "toggle-play";
  }
  if (key === "m" && options.supportsMute) {
    return "toggle-mute";
  }
  if (input.key === "ArrowLeft" && options.canSeek) {
    return "seek-backward";
  }
  if (input.key === "ArrowRight" && options.canSeek) {
    return "seek-forward";
  }
  if (key === "f" && options.canFullscreen) {
    return "fullscreen";
  }
  if (key === "c" && options.canShowCaptions) {
    return "toggle-captions";
  }
  return null;
}

export function shouldRevealVibePlayerChromeForKey(input: {
  chromeHidden: boolean;
  key: string;
}): boolean {
  return input.chromeHidden && input.key === "Tab";
}
