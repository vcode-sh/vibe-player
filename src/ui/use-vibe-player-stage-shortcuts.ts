import type {
  VibePlayerCapabilities,
  VibePlayerController,
  VibePlayerShortcutAction,
} from "../core";
import { useVibePlayerShortcuts } from "../react/use-vibe-player-shortcuts";
import {
  useVibePlayerAnnouncer,
  type VibePlayerAnnouncer,
} from "./use-vibe-player-announcer";
import { useVibePlayerKeyboardAnnouncements } from "./use-vibe-player-keyboard-announcements";

interface UseVibePlayerStageShortcutsInput {
  capabilities: VibePlayerCapabilities;
  controller: VibePlayerController;
  enabled: boolean;
  onShortcut: (action: VibePlayerShortcutAction) => void;
  rootElement: HTMLElement | null;
}

/**
 * Keyboard shortcuts on the focused player and the player's announcer: each
 * shortcut runs, then its settled result is announced. Both assemblies use
 * it, so every ready-made player has exactly one announcer.
 */
export function useVibePlayerStageShortcuts({
  capabilities,
  controller,
  enabled,
  onShortcut,
  rootElement,
}: UseVibePlayerStageShortcutsInput): VibePlayerAnnouncer {
  const announcer = useVibePlayerAnnouncer();
  const noteShortcut = useVibePlayerKeyboardAnnouncements(
    announcer.announce,
    controller
  );
  useVibePlayerShortcuts({
    canFullscreen: capabilities.canFullscreen,
    canSeek: capabilities.canSeek,
    canShowCaptions: capabilities.canShowCaptions,
    enabled,
    onShortcut: (action) => {
      onShortcut(action);
      noteShortcut(action);
    },
    supportsMute: capabilities.supportsMute,
    target: rootElement,
  });
  return announcer;
}
