export class PreviewMotionQuery extends EventTarget implements MediaQueryList {
  matches = false;
  readonly media = "(prefers-reduced-motion: reduce)";
  onchange: MediaQueryList["onchange"] = null;

  addListener = () => undefined;
  removeListener = () => undefined;

  setMatches(matches: boolean): void {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

export class PreviewVisibilityObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  private readonly callback: IntersectionObserverCallback;
  private target: Element | null = null;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  disconnect = () => undefined;
  observe(target: Element): void {
    this.target = target;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve = () => undefined;

  deliver(isIntersecting: boolean): void {
    const { target } = this;
    if (!target) {
      throw new Error("Expected an observed preview.");
    }
    const rect = target.getBoundingClientRect();
    this.callback(
      [
        {
          boundingClientRect: rect,
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: rect,
          isIntersecting,
          rootBounds: null,
          target,
          time: 0,
        },
      ],
      this
    );
  }
}
