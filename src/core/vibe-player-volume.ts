/** Input snapshot for package-owned or custom volume controls. */
export interface VibePlayerVolumeStateInput {
  /** Whether the provider is currently muted. */
  muted: boolean;
  /** Normalized provider volume in the `0..1` range. */
  volume: number;
}

/** Presentation-ready volume state for headless/custom controls. */
export interface VibePlayerVolumeState {
  /** Whether the provider is currently muted. */
  muted: boolean;
  /** Rounded `0..100` volume value for labels and ARIA state. */
  percent: number;
  /** True when muted or effectively at 0% volume. */
  silent: boolean;
  /** Clamped normalized provider volume in the `0..1` range. */
  value: number;
  /** Human-readable volume text for labels and assistive UI. */
  valueText: string;
}

/** Clamp a provider volume value into the package `0..1` contract. */
export function clampVibePlayerVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Convert a normalized provider volume into a rounded `0..100` percent. */
export function getVibePlayerVolumePercent(value: number): number {
  return Math.round(clampVibePlayerVolume(value) * 100);
}

/** Create a presentation snapshot for package-owned or headless volume UI. */
export function createVibePlayerVolumeState({
  muted,
  volume,
}: VibePlayerVolumeStateInput): VibePlayerVolumeState {
  const value = clampVibePlayerVolume(volume);
  const percent = getVibePlayerVolumePercent(value);
  const silent = muted || percent === 0;
  const valueText = muted ? `Muted, volume ${percent}%` : `Volume ${percent}%`;
  return {
    muted,
    percent,
    silent,
    value,
    valueText,
  };
}
