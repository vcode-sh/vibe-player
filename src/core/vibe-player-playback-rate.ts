export const vibePlayerPlaybackRates = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function formatVibePlayerPlaybackRate(rate: number): string {
  return `${Number.isInteger(rate) ? rate.toFixed(0) : String(rate)}x`;
}

export function getNextVibePlayerPlaybackRate(
  currentRate: number,
  availableRates?: readonly number[]
): number {
  const rates = availableRates ?? vibePlayerPlaybackRates;
  if (rates.length === 0) {
    return currentRate;
  }
  const currentIndex = rates.indexOf(currentRate);
  if (currentIndex === -1) {
    return availableRates
      ? (rates.find((rate) => rate > currentRate) ?? rates[0] ?? currentRate)
      : 1;
  }
  return rates[(currentIndex + 1) % rates.length] ?? currentRate;
}
