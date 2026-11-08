import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Moves one rendered player between host elements without remounting it. */
export interface VibePlayerHostFrameProps {
  children: ReactNode;
  /**
   * The element that shows the player. Changing it moves the same media and
   * chrome there; `null` leaves the player in its current host.
   */
  host: HTMLElement | null;
}

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * `moveBefore` keeps iframes (YouTube) and focus alive where browsers support
 * it; `append` is the same synchronous move, which a playing `<video>` survives.
 */
function moveFrame(frame: HTMLElement, host: HTMLElement): void {
  if (frame.parentElement === host) {
    return;
  }
  // Older engines lack `moveBefore` although the DOM types declare it.
  if (
    typeof host.moveBefore === "function" &&
    frame.isConnected &&
    host.isConnected
  ) {
    try {
      host.moveBefore(frame, null);
      return;
    } catch {
      // A cross-document move is not state-preserving; append instead.
    }
  }
  host.append(frame);
}

/**
 * Renders `children` into one package-owned element that follows `host`.
 * React state, the media element and its buffer survive every move. Renders
 * nothing on the server and until the first client commit.
 */
export function VibePlayerHostFrame({
  children,
  host,
}: VibePlayerHostFrameProps) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  useCommitEffect(() => {
    const element = document.createElement("div");
    element.className = "vibe-player-host-frame";
    element.style.display = "contents";
    setFrame(element);
    return () => element.remove();
  }, []);
  useCommitEffect(() => {
    if (frame && host) {
      moveFrame(frame, host);
    }
  }, [frame, host]);
  return frame ? createPortal(children, frame) : null;
}
