import { useCallback, useEffect, useRef, useState } from "react";

const volumePopoverCommitDismissDelayMs = 520;
const volumePopoverIdleDismissDelayMs = 900;

export function useVibePlayerVolumePopover() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const commitDismissPendingRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const dismissDeadlineRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    dismissDeadlineRef.current = null;
  }, []);

  const closePopover = useCallback(
    (restoreFocus = false) => {
      clearDismissTimer();
      commitDismissPendingRef.current = false;
      pointerActiveRef.current = false;
      pointerInsideRef.current = false;
      setActive(false);
      setOpen(false);
      const rootElement = rootRef.current;
      if (
        restoreFocus &&
        rootElement &&
        document.activeElement &&
        rootElement.contains(document.activeElement)
      ) {
        triggerRef.current?.focus({ preventScroll: true });
      }
    },
    [clearDismissTimer]
  );

  const scheduleDismiss = useCallback(
    (delayMs = volumePopoverIdleDismissDelayMs, keepSooner = true) => {
      const nextDeadline = Date.now() + delayMs;
      if (
        keepSooner &&
        dismissDeadlineRef.current !== null &&
        dismissDeadlineRef.current <= nextDeadline
      ) {
        return;
      }
      clearDismissTimer();
      if (pointerActiveRef.current || pointerInsideRef.current) {
        return;
      }
      dismissDeadlineRef.current = nextDeadline;
      dismissTimerRef.current = window.setTimeout(() => {
        dismissTimerRef.current = null;
        dismissDeadlineRef.current = null;
        commitDismissPendingRef.current = false;
        if (!pointerActiveRef.current) {
          closePopover(false);
        }
      }, delayMs);
    },
    [clearDismissTimer, closePopover]
  );

  const scheduleCommitDismiss = useCallback(() => {
    commitDismissPendingRef.current = true;
    scheduleDismiss(volumePopoverCommitDismissDelayMs, false);
  }, [scheduleDismiss]);

  const holdPopover = useCallback(() => {
    pointerInsideRef.current = true;
    clearDismissTimer();
    setOpen(true);
  }, [clearDismissTimer]);

  const releasePopover = useCallback(() => {
    pointerInsideRef.current = false;
    if (commitDismissPendingRef.current) {
      scheduleCommitDismiss();
      return;
    }
    scheduleDismiss();
  }, [scheduleCommitDismiss, scheduleDismiss]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const releaseWhenOutside = (event: MouseEvent | PointerEvent) => {
      const root = rootRef.current;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (root && element && root.contains(element)) {
        pointerInsideRef.current = true;
        clearDismissTimer();
        return;
      }
      if (pointerInsideRef.current || dismissTimerRef.current === null) {
        releasePopover();
      }
    };
    document.addEventListener("mousemove", releaseWhenOutside);
    document.addEventListener("pointermove", releaseWhenOutside);
    return () => {
      document.removeEventListener("mousemove", releaseWhenOutside);
      document.removeEventListener("pointermove", releaseWhenOutside);
    };
  }, [clearDismissTimer, open, releasePopover]);

  useEffect(() => clearDismissTimer, [clearDismissTimer]);

  return {
    active,
    closePopover,
    holdPopover,
    open,
    pointerActiveRef,
    releasePopover,
    rootRef,
    scheduleCommitDismiss,
    scheduleDismiss,
    setActive,
    sliderRef,
    triggerRef,
  };
}
