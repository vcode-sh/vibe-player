/**
 * The moment a timeline is previewing: under the pointer, a scrub or a
 * keyboard seek. Read it in `subscribe` listeners to move graph parts through
 * refs; it changes on every pointer move without re-rendering React.
 */
export interface VibePlayerTimelinePreview {
  /** Previewed fraction of the duration (0..1); null at rest. */
  readonly fraction: number | null;
  /** Calls `listener` after each change; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

export interface VibePlayerTimelinePreviewSource
  extends VibePlayerTimelinePreview {
  /** Clamps to 0..1; null or a non-finite value ends the preview. */
  set(fraction: number | null): void;
}

export function createVibePlayerTimelinePreview(): VibePlayerTimelinePreviewSource {
  const listeners = new Set<() => void>();
  let current: number | null = null;
  return {
    get fraction() {
      return current;
    },
    set(fraction) {
      const next =
        fraction === null || !Number.isFinite(fraction)
          ? null
          : Math.min(1, Math.max(0, fraction));
      if (next === current) {
        return;
      }
      current = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
