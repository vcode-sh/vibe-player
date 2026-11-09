import { useCallback, useEffect, useRef } from "react";
import type {
  VibePlayerController,
  VibePlayerShortcutAction,
  VibePlayerSnapshot,
} from "../core";
import { useVibePlayerUI } from "./vibe-player-ui-context";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

/** Quiet time after the last key before the result is announced. */
export const VIBE_PLAYER_KEYBOARD_ANNOUNCEMENT_DELAY_MS = 500;

type AnnouncedKind = "playback" | "position";

function getAnnouncedKind(
  action: VibePlayerShortcutAction
): AnnouncedKind | null {
  if (action === "toggle-play") {
    return "playback";
  }
  if (action === "seek-backward" || action === "seek-forward") {
    return "position";
  }
  return null;
}

function describePosition(
  snapshot: VibePlayerSnapshot,
  formatTime: (seconds: number) => string,
  labels: Required<VibePlayerLabels>
): string {
  const time = formatTime(snapshot.currentTime);
  if (!(Number.isFinite(snapshot.duration) && snapshot.duration > 0)) {
    return time;
  }
  return labels.seekValue(time, formatTime(snapshot.duration));
}

function getPlaybackAnnouncement(
  snapshot: VibePlayerSnapshot,
  labels: Required<VibePlayerLabels>
): string {
  return snapshot.paused ? labels.paused : labels.playing;
}

/**
 * Keyboard play/pause and seeks give no visible confirmation to a screen
 * reader user. After the keys settle, the outcome read from the controller
 * ("Paused", "Playing", "1:20 of 5:00") is announced once.
 */
export function useVibePlayerKeyboardAnnouncements(
  announce: (text: string) => void,
  controller: VibePlayerController
) {
  const { formatTime, labels } = useVibePlayerUI();
  const timer = useRef<number | null>(null);
  const latest = useRef({ announce, controller, formatTime, labels });
  latest.current = { announce, controller, formatTime, labels };
  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => stop, [stop]);
  return useCallback(
    (action: VibePlayerShortcutAction) => {
      const kind = getAnnouncedKind(action);
      if (!kind) {
        return;
      }
      stop();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        const { current } = latest;
        const { snapshot } = current.controller.getState();
        const { formatTime: format, labels: text } = current;
        current.announce(
          kind === "position"
            ? describePosition(snapshot, format, text)
            : getPlaybackAnnouncement(snapshot, text)
        );
      }, VIBE_PLAYER_KEYBOARD_ANNOUNCEMENT_DELAY_MS);
    },
    [stop]
  );
}
