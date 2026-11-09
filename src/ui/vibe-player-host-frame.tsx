import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { VibePlayerHostDock } from "./vibe-player-host-dock";

/** Moves one rendered player between host elements without remounting it. */
export interface VibePlayerHostFrameProps {
  children: ReactNode;
  /**
   * The element that shows the player. Changing it moves the same media and
   * chrome there; `null` leaves the player in its current host. While no
   * host on the page shows it, the player waits in a hidden parking element.
   */
  host: HTMLElement | null;
}

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Renders `children` into one package-owned element that follows `host`.
 * React state, the media element and its buffer survive every move. When
 * the host leaves the page (or is not on it yet), the element moves into a
 * hidden, inert parking root, so media stays alive until the next host
 * appears; media an engine paused during a move resumes. Renders nothing on
 * the server and until the first client commit.
 */
export function VibePlayerHostFrame({
  children,
  host,
}: VibePlayerHostFrameProps) {
  const [dock, setDock] = useState<VibePlayerHostDock | null>(null);
  useCommitEffect(() => {
    const created = new VibePlayerHostDock(document);
    setDock(created);
    return () => created.dispose();
  }, []);
  useCommitEffect(() => {
    dock?.follow(host);
  }, [dock, host]);
  return dock ? createPortal(children, dock.frame) : null;
}
