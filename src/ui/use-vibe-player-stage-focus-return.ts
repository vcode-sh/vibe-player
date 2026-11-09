import { useEffect } from "react";
import { useVibePlayerCommitEffect } from "./use-vibe-player-commit-effect";

interface VibePlayerStageFocusOptions {
  autoFocus?: boolean | undefined;
  open?: boolean | undefined;
}

/**
 * Focus the player region on open when asked, and keep focus (and with it
 * the shortcuts) there when the control holding it hides and turns inert.
 */
export function useVibePlayerStageFocusReturn(
  { autoFocus = false, open = true }: VibePlayerStageFocusOptions,
  chromeHidden: boolean,
  rootElement: HTMLElement | null
): void {
  useVibePlayerCommitEffect(() => {
    const active = rootElement?.ownerDocument.activeElement;
    if (
      chromeHidden &&
      active instanceof HTMLElement &&
      active !== rootElement &&
      active.closest("[inert]") &&
      rootElement?.contains(active)
    ) {
      rootElement.focus({ preventScroll: true });
    }
  }, [chromeHidden, rootElement]);
  useEffect(() => {
    if (autoFocus && open) {
      rootElement?.focus({ preventScroll: true });
    }
  }, [autoFocus, open, rootElement]);
}
