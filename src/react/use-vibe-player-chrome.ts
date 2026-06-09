import { useCallback, useEffect, useRef, useState } from "react";

export const VIBE_PLAYER_CHROME_IDLE_DELAY_MS = 2400;

export interface UseVibePlayerChromeOptions {
  autoHide?: boolean;
  idleDelayMs?: number;
  open: boolean;
}

export interface VibePlayerChromeState {
  chromeHidden: boolean;
  holdChrome: () => void;
  releaseChrome: () => void;
  scheduleChromeHide: () => void;
  showChrome: () => void;
}

export function useVibePlayerChrome({
  autoHide = true,
  idleDelayMs = VIBE_PLAYER_CHROME_IDLE_DELAY_MS,
  open,
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
    if (!autoHide || focusWithinRef.current) {
      return;
    }
    idleTimerRef.current = window.setTimeout(
      () => setChromeHidden(true),
      idleDelayMs
    );
  }, [autoHide, clearIdleTimer, idleDelayMs]);

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
    if (autoHide) {
      return;
    }
    clearIdleTimer();
    setChromeHidden(false);
  }, [autoHide, clearIdleTimer]);

  return {
    chromeHidden,
    holdChrome,
    releaseChrome,
    scheduleChromeHide,
    showChrome,
  };
}
