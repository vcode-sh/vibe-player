import { useCallback, useEffect, useRef, useState } from "react";
import { useVibePlayerCommitEffect } from "./use-vibe-player-commit-effect";

/** How long an announcement stays in the live region before it clears. */
export const VIBE_PLAYER_ANNOUNCEMENT_CLEAR_MS = 5000;

/** Text for the player's polite live region and the command that sets it. */
export interface VibePlayerAnnouncer {
  announce: (text: string) => void;
  message: string;
}

const repeatMarker = " ";

/**
 * Owns one live-region message. A repeated text gets a trailing no-break
 * space so assistive technology hears it again, and every message clears
 * after a while so a stale status is not read twice while browsing.
 */
export function useVibePlayerAnnouncer(): VibePlayerAnnouncer {
  const [message, setMessage] = useState("");
  const clearTimer = useRef<number | null>(null);
  const stopClearTimer = useCallback(() => {
    if (clearTimer.current !== null) {
      window.clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
  }, []);
  const announce = useCallback(
    (text: string) => {
      stopClearTimer();
      setMessage((current) => (current === text ? text + repeatMarker : text));
      clearTimer.current = window.setTimeout(() => {
        clearTimer.current = null;
        setMessage("");
      }, VIBE_PLAYER_ANNOUNCEMENT_CLEAR_MS);
    },
    [stopClearTimer]
  );
  useEffect(() => stopClearTimer, [stopClearTimer]);
  return { announce, message };
}

/**
 * Announces a player status once each time it starts (busy, error). It runs
 * in the commit that shows the status, so text and announcement land together.
 */
export function useVibePlayerStatusAnnouncement(
  announce: (text: string) => void,
  status: string | null
): void {
  useVibePlayerCommitEffect(() => {
    if (status) {
      announce(status);
    }
  }, [announce, status]);
}
