/** Seconds a skip, an arrow or J/L press, a double tap or a system seek moves. */
export const VIBE_PLAYER_DEFAULT_SEEK_STEP = 10;

/** Any positive, finite number of seconds; anything else falls back to 10. */
export function resolveVibePlayerSeekStep(seconds: number | undefined): number {
  return seconds !== undefined && Number.isFinite(seconds) && seconds > 0
    ? seconds
    : VIBE_PLAYER_DEFAULT_SEEK_STEP;
}
