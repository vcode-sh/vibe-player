import { useCallback, useEffect, useRef, useState } from "react";
import { clampVibePlayerTime } from "./vibe-player-surface-phase";

const keyboardFeedbackMs = 700;
const settleTimeoutMs = 1000;
const settledDistance = 0.75;

export interface UseVibePlayerSurfaceScrubInput {
  currentTime: number;
  duration: number;
  /** Keeps the controls up for the scrub; `release` lets them hide again. */
  hold: () => void;
  release: () => void;
  seekTo: (seconds: number) => void;
}

export interface VibePlayerSurfaceScrub {
  previewTime: number | null;
  scrubbing: boolean;
  scrubEnd: (commit?: boolean) => void;
  scrubStart: () => void;
  scrubTo: (fraction: number) => void;
  seekBy: (seconds: number) => void;
}

/**
 * One scrub session: preview while dragging, commit once on release.
 * Keyboard seeks commit at once and keep the preview for 700 ms. The preview
 * stays until playback reaches it, so the time never jumps back mid-seek.
 */
export function useVibePlayerSurfaceScrub({
  currentTime,
  duration,
  hold,
  release,
  seekTo,
}: UseVibePlayerSurfaceScrubInput): VibePlayerSurfaceScrub {
  const [scrubbing, setScrubbing] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const preview = useRef<number | null>(null);
  const keyboardTimer = useRef<number | null>(null);
  const live = useRef({ currentTime, duration });
  live.current = { currentTime, duration };

  const show = useCallback((seconds: number) => {
    preview.current = seconds;
    setPreviewTime(seconds);
  }, []);
  const clearKeyboard = useCallback(() => {
    if (keyboardTimer.current !== null) {
      window.clearTimeout(keyboardTimer.current);
      keyboardTimer.current = null;
    }
  }, []);
  const scrubStart = useCallback(() => {
    clearKeyboard();
    hold();
    setScrubbing(true);
  }, [clearKeyboard, hold]);
  const scrubTo = useCallback(
    (fraction: number) => {
      const total = live.current.duration;
      show(clampVibePlayerTime(fraction * total, total));
    },
    [show]
  );
  const scrubEnd = useCallback(
    (commit = true) => {
      clearKeyboard();
      if (commit && preview.current !== null) {
        seekTo(preview.current);
      } else {
        preview.current = null;
        setPreviewTime(null);
      }
      setScrubbing(false);
      release();
    },
    [clearKeyboard, release, seekTo]
  );
  const seekBy = useCallback(
    (seconds: number) => {
      const { currentTime: now, duration: total } = live.current;
      const target = clampVibePlayerTime(
        (preview.current ?? now) + seconds,
        total
      );
      clearKeyboard();
      hold();
      setScrubbing(true);
      show(target);
      seekTo(target);
      keyboardTimer.current = window.setTimeout(() => {
        keyboardTimer.current = null;
        setScrubbing(false);
        release();
      }, keyboardFeedbackMs);
    },
    [clearKeyboard, hold, release, seekTo, show]
  );

  const settling = !scrubbing && previewTime !== null;
  const settle = useCallback(() => {
    preview.current = null;
    setPreviewTime(null);
  }, []);
  useEffect(() => {
    if (
      settling &&
      Math.abs(currentTime - (preview.current ?? currentTime)) < settledDistance
    ) {
      settle();
    }
  }, [currentTime, settle, settling]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each new preview restarts the settle timeout.
  useEffect(() => {
    if (!settling) {
      return;
    }
    const timeoutId = window.setTimeout(settle, settleTimeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [previewTime, settle, settling]);
  useEffect(() => clearKeyboard, [clearKeyboard]);

  return { previewTime, scrubbing, scrubEnd, scrubStart, scrubTo, seekBy };
}
