import { vi } from "vitest";

interface VisibilityObservation {
  callback: IntersectionObserverCallback;
  disconnected: boolean;
  observer: IntersectionObserver;
  targets: Set<Element>;
}

export function stubPlayerIntersections() {
  const observations: VisibilityObservation[] = [];
  class Observer implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly scrollMargin = "0px";
    readonly thresholds = [0.25];
    private readonly observation: VisibilityObservation;
    constructor(callback: IntersectionObserverCallback) {
      this.observation = {
        callback,
        disconnected: false,
        observer: this,
        targets: new Set(),
      };
      observations.push(this.observation);
    }
    disconnect(): void {
      this.observation.disconnected = true;
    }
    observe(target: Element): void {
      this.observation.targets.add(target);
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(target: Element): void {
      this.observation.targets.delete(target);
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  return {
    /** Live observers; players with one threshold share one. */
    activeObservers: () =>
      observations.filter(
        (observation) =>
          !observation.disconnected && observation.targets.size > 0
      ).length,
    emit(ratio: number) {
      for (const observation of observations) {
        if (observation.disconnected || observation.targets.size === 0) {
          continue;
        }
        observation.callback(
          Array.from(observation.targets, (target) => ({
            boundingClientRect: new DOMRect(),
            intersectionRatio: ratio,
            intersectionRect: new DOMRect(),
            isIntersecting: ratio > 0,
            rootBounds: null,
            target,
            time: 0,
          })),
          observation.observer
        );
      }
    },
  };
}
