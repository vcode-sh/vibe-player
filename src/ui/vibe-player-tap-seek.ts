/** Where a tap lands: the left third seeks back, the right third forward. */
export type VibePlayerTapSide = -1 | 0 | 1;

/** Longest gap between the two taps of a double tap (Android's default). */
export const VIBE_PLAYER_DOUBLE_TAP_MS = 300;
/** A seek burst keeps adding a step per tap until taps stop this long. */
export const VIBE_PLAYER_TAP_BURST_MS = 700;

/** The double-tap indicator: the side, the burst's total and its tap count. */
export interface VibePlayerSeekRippleState {
  /** False while fading after the burst. */
  active: boolean;
  count: number;
  seconds: number;
  side: -1 | 1;
}

export interface VibePlayerTapSeekHandlers {
  /** A burst ended; the indicator may fade. */
  end(): void;
  /** Steps `count` (1, 2, 3…) of a burst toward `side`, one step per call. */
  seek(side: -1 | 1, count: number): void;
}

export interface VibePlayerTapSeek {
  /** Clears pending timers without running a pending single tap. */
  cancel(): void;
  /**
   * A tap at `fraction` (0..1) of the picture's width. `single` runs at once
   * in the centre, or once no second tap follows on a side.
   */
  tap(fraction: number, single: () => void): void;
}

/** Thirds of the width; anything unmeasurable counts as the centre. */
export function getVibePlayerTapSide(fraction: number): VibePlayerTapSide {
  if (fraction < 1 / 3) {
    return -1;
  }
  return fraction > 2 / 3 ? 1 : 0;
}

/**
 * YouTube-style double tap: a second tap on the same side within 300 ms
 * starts a burst, and every further side tap within 700 ms of the last adds a
 * step (switching sides restarts the count). A lone side tap runs `single`
 * after 300 ms; a centre tap runs it at once and ends the current burst.
 */
export function createVibePlayerTapSeek(
  handlers: VibePlayerTapSeekHandlers
): VibePlayerTapSeek {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { side: -1 | 1; single: () => void } | null = null;
  let burst: { count: number; side: -1 | 1 } | null = null;
  const wait = (ms: number, then: () => void) => {
    clearTimeout(timer);
    timer = setTimeout(then, ms);
  };
  const step = (side: -1 | 1) => {
    burst = { count: burst?.side === side ? burst.count + 1 : 1, side };
    handlers.seek(side, burst.count);
    wait(VIBE_PLAYER_TAP_BURST_MS, () => {
      burst = null;
      handlers.end();
    });
  };
  return {
    cancel() {
      clearTimeout(timer);
      pending = null;
      burst = null;
    },
    tap(fraction, single) {
      const side = getVibePlayerTapSide(fraction);
      if (side !== 0 && (burst || pending?.side === side)) {
        pending = null;
        step(side);
        return;
      }
      const first = pending;
      pending = null;
      clearTimeout(timer);
      if (burst) {
        burst = null;
        handlers.end();
      }
      first?.single();
      if (side === 0) {
        single();
        return;
      }
      pending = { side, single };
      wait(VIBE_PLAYER_DOUBLE_TAP_MS, () => {
        pending = null;
        single();
      });
    },
  };
}
