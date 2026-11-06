type IntersectionListener = (entry: IntersectionObserverEntry) => void;

interface SharedIntersectionObserver {
  listeners: Map<Element, Set<IntersectionListener>>;
  observer: IntersectionObserver;
}

const observers = new Map<number, SharedIntersectionObserver>();

function createSharedObserver(threshold: number): SharedIntersectionObserver {
  const listeners = new Map<Element, Set<IntersectionListener>>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        for (const listener of listeners.get(entry.target) ?? []) {
          listener(entry);
        }
      }
    },
    { threshold }
  );
  return { listeners, observer };
}

/**
 * One observer per threshold serves every player on the page, so a chat
 * history with a hundred videos keeps one browser observer, not a hundred.
 * Each subscription receives a fresh initial entry for its target.
 */
export function observeVibePlayerIntersection(
  target: Element,
  threshold: number,
  listener: IntersectionListener
): () => void {
  const shared = observers.get(threshold) ?? createSharedObserver(threshold);
  observers.set(threshold, shared);
  const targetListeners = shared.listeners.get(target) ?? new Set();
  shared.listeners.set(target, targetListeners);
  targetListeners.add(listener);
  // Re-observing delivers the current state to the new listener.
  shared.observer.unobserve(target);
  shared.observer.observe(target);
  return () => {
    targetListeners.delete(listener);
    if (targetListeners.size > 0) {
      return;
    }
    shared.listeners.delete(target);
    shared.observer.unobserve(target);
    if (shared.listeners.size === 0 && observers.get(threshold) === shared) {
      shared.observer.disconnect();
      observers.delete(threshold);
    }
  };
}
