import type {
  VibePlayerCapabilities,
  VibePlayerQualityOption,
} from "./vibe-player-types";

/** Return the selected quality option, falling back to the first option. */
export function getSelectedVibePlayerQualityOption(
  options: VibePlayerQualityOption[] | undefined
): VibePlayerQualityOption | null {
  if (!options || options.length === 0) {
    return null;
  }
  return options.find((option) => option.selected) ?? options[0] ?? null;
}

/** Decide whether a custom/package quality menu should be rendered. */
export function canRenderVibePlayerQualityOptions(
  capabilities: VibePlayerCapabilities,
  options: VibePlayerQualityOption[] | undefined
): boolean {
  return capabilities.supportsQualitySelection && Boolean(options?.length);
}
