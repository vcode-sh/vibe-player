/** Listeners that keep publishing are cut off after this many restarts. */
const maxPasses = 32;

/**
 * Tells listeners the latest value of a page-wide registry. A value
 * published while listeners run restarts the delivery with the newer value,
 * so a listener can miss a value that was already replaced but always ends
 * on the current one. A throwing listener cannot stop the others.
 */
export class VibePlayerLatestNotifier<T> {
  private readonly listeners = new Set<(value: T) => void>();
  private readonly read: () => T;
  private delivering = false;
  private stale = false;

  constructor(read: () => T) {
    this.read = read;
  }

  get size(): number {
    return this.listeners.size;
  }

  add(listener: (value: T) => void): () => void {
    const entry = (value: T) => listener(value);
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }

  publish(): void {
    if (this.delivering) {
      this.stale = true;
      return;
    }
    this.delivering = true;
    try {
      for (let pass = 0; pass < maxPasses; pass += 1) {
        this.stale = false;
        this.deliver(this.read());
        if (!this.stale) {
          return;
        }
      }
    } finally {
      this.delivering = false;
    }
  }

  private deliver(value: T): void {
    for (const listener of [...this.listeners]) {
      if (this.stale) {
        return;
      }
      if (!this.listeners.has(listener)) {
        continue;
      }
      try {
        listener(value);
      } catch {
        // One host listener cannot keep the others from hearing the change.
      }
    }
  }
}
