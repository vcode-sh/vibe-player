type StateListener<T> = (state: T) => void;

/**
 * `subscribe()` listeners. A delivery reaches the listeners subscribed when
 * it started that are still subscribed when their turn comes: one added
 * meanwhile starts with the next state, one removed receives nothing more.
 */
export class VibePlayerStateListeners<T> {
  private readonly listeners = new Set<StateListener<T>>();

  add(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  *current(): Iterable<StateListener<T>> {
    for (const listener of [...this.listeners]) {
      if (this.listeners.has(listener)) {
        yield listener;
      }
    }
  }

  /**
   * After an overflow dropped states, brings every listener to `latest()`.
   * A listener that changes the state again while it settles is not called
   * again; the others then receive that newer state, so each pass either
   * finishes or finds another such listener.
   */
  settle(
    latest: () => T,
    deliver: (listener: StateListener<T>, state: T) => void
  ): void {
    const received = new Map<StateListener<T>, T>();
    const runaways = new Set<StateListener<T>>();
    for (let pass = 0; pass <= this.listeners.size; pass += 1) {
      let behind = false;
      for (const listener of this.current()) {
        const state = latest();
        if (runaways.has(listener) || received.get(listener) === state) {
          continue;
        }
        behind = true;
        received.set(listener, state);
        deliver(listener, state);
        if (latest() !== state) {
          runaways.add(listener);
        }
      }
      if (!behind) {
        return;
      }
    }
  }
}
