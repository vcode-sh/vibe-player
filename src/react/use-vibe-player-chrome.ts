import { useCallback, useEffect, useRef, useState } from "react";

export const VIBE_PLAYER_CHROME_IDLE_DELAY_MS = 2400;

export interface UseVibePlayerChromeOptions {
  autoHide?: boolean;
  idleDelayMs?: number;
  open: boolean;
  /** Only actively playing media may hide its controls. */
  playing?: boolean;
}

export interface VibePlayerChromeState {
  chromeHidden: boolean;
  /** Hides at once while playing, unless keyboard focus holds the chrome. */
  hideChrome: () => void;
  holdChrome: () => void;
  releaseChrome: () => void;
  scheduleChromeHide: () => void;
  showChrome: () => void;
}

export function useVibePlayerChrome({
  autoHide = true,
  idleDelayMs = VIBE_PLAYER_CHROME_IDLE_DELAY_MS,
  open,
  playing = true,
}: UseVibePlayerChromeOptions): VibePlayerChromeState {
  const focusWithinRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const [chromeHidden, setChromeHidden] = useState(false);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current === null) {
      return;
    }
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const scheduleChromeHide = useCallback(() => {
    clearIdleTimer();
    if (!(open && autoHide && playing) || focusWithinRef.current) {
      return;
    }
    idleTimerRef.current = window.setTimeout(
      () => setChromeHidden(true),
      idleDelayMs
    );
  }, [autoHide, clearIdleTimer, idleDelayMs, open, playing]);

  const hideChrome = useCallback(() => {
    clearIdleTimer();
    if (open && autoHide && playing && !focusWithinRef.current) {
      setChromeHidden(true);
    }
  }, [autoHide, clearIdleTimer, open, playing]);

  const holdChrome = useCallback(() => {
    focusWithinRef.current = true;
    clearIdleTimer();
    setChromeHidden(false);
  }, [clearIdleTimer]);

  const releaseChrome = useCallback(() => {
    focusWithinRef.current = false;
    scheduleChromeHide();
  }, [scheduleChromeHide]);

  const showChrome = useCallback(() => {
    setChromeHidden(false);
    scheduleChromeHide();
  }, [scheduleChromeHide]);

  useEffect(() => clearIdleTimer, [clearIdleTimer]);

  useEffect(() => {
    if (!open) {
      focusWithinRef.current = false;
      clearIdleTimer();
      setChromeHidden(false);
      return;
    }
    showChrome();
  }, [clearIdleTimer, open, showChrome]);

  useEffect(() => {
    if (autoHide && playing) {
      return;
    }
    clearIdleTimer();
    setChromeHidden(false);
  }, [autoHide, clearIdleTimer, playing]);

  return {
    chromeHidden,
    hideChrome,
    holdChrome,
    releaseChrome,
    scheduleChromeHide,
    showChrome,
  };
}
