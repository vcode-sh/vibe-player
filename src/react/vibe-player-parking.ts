/** The class of the hidden root a host frame waits in while no host shows it. */
export const vibePlayerParkingClass = "vibe-player-parking";

const unparkListeners = new Set<() => void>();

/** Whether `element` waits in a parking root, so its visibility is undecided. */
export function isVibePlayerParked(element: Element): boolean {
  return element.closest(`.${vibePlayerParkingClass}`) !== null;
}

/** Called after a parked frame moved into a host; returns unsubscribe. */
export function onVibePlayerUnparked(listener: () => void): () => void {
  const entry = () => listener();
  unparkListeners.add(entry);
  return () => {
    unparkListeners.delete(entry);
  };
}

/** The host frame announces that a parked frame reached a host. */
export function notifyVibePlayerUnparked(): void {
  for (const listener of [...unparkListeners]) {
    listener();
  }
}
