import type { VibePlayerCapabilities, VibePlayerQualityOption } from "../core";

export interface VibePlayerQualityControlProps {
  capabilities: VibePlayerCapabilities;
  onSetQuality: ((qualityId: string) => void) | undefined;
  qualityOptions: VibePlayerQualityOption[] | undefined;
}

export function VibePlayerQualityControl({
  capabilities,
  onSetQuality,
  qualityOptions,
}: VibePlayerQualityControlProps) {
  if (
    !(
      capabilities.supportsQualitySelection &&
      onSetQuality &&
      qualityOptions &&
      qualityOptions.length > 2
    )
  ) {
    return null;
  }
  const selectedOption =
    qualityOptions.find((option) => option.selected) ?? qualityOptions[0];
  if (!selectedOption) {
    return null;
  }
  return (
    <select
      aria-label="Quality"
      className="vibe-player-controls__select"
      onChange={(event) => onSetQuality(event.currentTarget.value)}
      title="Quality"
      value={selectedOption.id}
    >
      {qualityOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
