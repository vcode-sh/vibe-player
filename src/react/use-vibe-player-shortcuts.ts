import { useEffect } from "react";
import {
  getVibePlayerShortcutAction,
  type VibePlayerShortcutAction,
  type VibePlayerShortcutOptions,
} from "../core";

export interface UseVibePlayerShortcutsOptions
  extends VibePlayerShortcutOptions {
  enabled: boolean;
  onShortcut: (action: VibePlayerShortcutAction) => void;
  target?: HTMLElement | Window | null;
}

function getTargetTagName(target: EventTarget | null): string | null {
  return target instanceof HTMLElement ? target.tagName : null;
}

function getTargetIsContentEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.isContentEditable;
}

export function useVibePlayerShortcuts({
  canFullscreen,
  canSeek,
  canShowCaptions,
  enabled,
  onShortcut,
  supportsMute,
  target,
}: UseVibePlayerShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const shortcutTarget = target ?? window;
    const handleKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      const action = getVibePlayerShortcutAction(
        {
          altKey: event.altKey,
          code: event.code,
          ctrlKey: event.ctrlKey,
          key: event.key,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          targetIsContentEditable: getTargetIsContentEditable(event.target),
          targetTagName: getTargetTagName(event.target),
        },
        { canFullscreen, canSeek, canShowCaptions, supportsMute }
      );
      if (!action) {
        return;
      }
      event.preventDefault();
      onShortcut(action);
    };

    shortcutTarget.addEventListener("keydown", handleKeyDown);
    return () => {
      shortcutTarget.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canFullscreen,
    canSeek,
    canShowCaptions,
    enabled,
    onShortcut,
    supportsMute,
    target,
  ]);
}
