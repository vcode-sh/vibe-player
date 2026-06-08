import { useLayoutEffect, useState } from "react";

export const VIBE_PLAYER_OVERLAY_EXIT_MS = 180;

export type VibePlayerOverlayPresenceState = "closing" | "open";

export interface VibePlayerOverlayPresence {
  rendered: boolean;
  state: VibePlayerOverlayPresenceState;
}

export function useVibePlayerOverlayPresence(
  open: boolean,
  exitMs = VIBE_PLAYER_OVERLAY_EXIT_MS
): VibePlayerOverlayPresence {
  const [rendered, setRendered] = useState(open);
  const [state, setState] = useState<VibePlayerOverlayPresenceState>(
    open ? "open" : "closing"
  );

  useLayoutEffect(() => {
    if (open) {
      setRendered(true);
      setState("open");
      return;
    }
    if (!rendered) {
      return;
    }

    setState("closing");
    const timeoutId = window.setTimeout(() => setRendered(false), exitMs);
    return () => window.clearTimeout(timeoutId);
  }, [exitMs, open, rendered]);

  return { rendered, state };
}
