import { useCallback, useEffect, useRef, useState } from "react";
import { useVibePlayerCommitEffect } from "./use-vibe-player-commit-effect";

/** How long an announcement stays in the live region before it clears. */
export const VIBE_PLAYER_ANNOUNCEMENT_CLEAR_MS = 5000;

/** Text for the player's polite live region and the commands that set it. */
export interface VibePlayerAnnouncer {
  announce: (text: string) => void;
  message: string;
  /**
   * Clears the region if it still holds exactly `text` (a status that
   * ended); a joined message is left to the timed clear.
   */
  withdraw: (text: string) => void;
}

const repeatMarker = " ";
const separator = ". ";

/**
 * The next region text. Texts announced in the same task (two statuses that
 * start in one render) are joined, without repeating a part; otherwise the
 * new text replaces the old, with a marker when it is the same text.
 */
function getNextMessage(current: string, text: string, joining: boolean) {
  const shown = current.endsWith(repeatMarker) ? current.slice(0, -1) : current;
  if (joining && shown) {
    return shown.split(separator).includes(text)
      ? current
      : `${shown}${separator}${text}`;
  }
  return current === text ? text + repeatMarker : text;
}

/**
 * Owns one live-region message. Texts announced in the same task are joined,
 * a repeated text gets a trailing no-break space so assistive technology
 * hears it again, and every message clears after a while so a stale status
 * is not read twice while browsing.
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
  const sameTask = useRef(false);
  const announce = useCallback(
    (text: string) => {
      stopClearTimer();
      const joining = sameTask.current;
      if (!joining) {
        sameTask.current = true;
        // Batched updates in one task must not drop the earlier text.
        Promise.resolve().then(() => {
          sameTask.current = false;
        });
      }
      setMessage((current) => getNextMessage(current, text, joining));
      clearTimer.current = window.setTimeout(() => {
        clearTimer.current = null;
        setMessage("");
      }, VIBE_PLAYER_ANNOUNCEMENT_CLEAR_MS);
    },
    [stopClearTimer]
  );
  const withdraw = useCallback((text: string) => {
    setMessage((current) =>
      current === text || current === text + repeatMarker ? "" : current
    );
  }, []);
  useEffect(() => stopClearTimer, [stopClearTimer]);
  return { announce, message, withdraw };
}

/**
 * Announces a player status once each time it starts (busy, error) and
 * withdraws it when it ends, so browsing never finds it stale. It runs in the
 * commit that shows the status, so text and announcement land together.
 */
export function useVibePlayerStatusAnnouncement(
  { announce, withdraw }: Pick<VibePlayerAnnouncer, "announce" | "withdraw">,
  status: string | null
): void {
  const shown = useRef<string | null>(null);
  useVibePlayerCommitEffect(() => {
    const previous = shown.current;
    shown.current = status;
    if (status) {
      announce(status);
    } else if (previous) {
      withdraw(previous);
    }
  }, [announce, status, withdraw]);
}
