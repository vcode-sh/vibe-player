export const vibePlayerPlaybackRates = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function formatVibePlayerPlaybackRate(rate: number): string {
  return `${Number.isInteger(rate) ? rate.toFixed(0) : String(rate)}x`;
}

export function getNextVibePlayerPlaybackRate(currentRate: number): number {
  const currentIndex = (vibePlayerPlaybackRates as readonly number[]).indexOf(
    currentRate
  );
  if (currentIndex === -1) {
    return 1;
  }
  const nextRate =
    vibePlayerPlaybackRates[
      (currentIndex + 1) % vibePlayerPlaybackRates.length
    ];
  return nextRate ?? 1;
}
