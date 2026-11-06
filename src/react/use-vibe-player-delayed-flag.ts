import { useEffect, useState } from "react";

/** True only after `active` has held for `delayMs`; null never turns true. */
export function useVibePlayerDelayedFlag(
  active: boolean,
  delayMs: number | null
): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    if (!active || delayMs === null) {
      return;
    }
    const timeoutId = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);
  return active && delayMs !== null && visible;
}
