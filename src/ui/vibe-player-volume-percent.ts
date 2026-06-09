export function clampVibePlayerVolumePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function getVibePlayerVolumeFromPercent(value: number): number {
  return clampVibePlayerVolumePercent(value) / 100;
}
