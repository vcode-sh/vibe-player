import type { VibePlayerQualityOption } from "../core/vibe-player-types";

export const hlsAutoQualityId = "auto";

const numericQualityNamePattern = /^\d+$/;

export interface ManagedHlsLevel {
  bitrate: number;
  height: number;
  name?: string | undefined;
  width?: number | undefined;
}

export function createHlsQualityOptions(
  levels: ManagedHlsLevel[],
  selectedLevelIndex: number
): VibePlayerQualityOption[] {
  if (levels.length === 0) {
    return [];
  }
  return [
    {
      auto: true,
      id: hlsAutoQualityId,
      label: "Auto",
      selected: selectedLevelIndex < 0,
    },
    ...levels.map((level, index) => ({
      ...createQualityMetadata(level),
      auto: false,
      id: createHlsLevelQualityId(index),
      label: createHlsQualityLabel(level, index),
      selected: selectedLevelIndex === index,
    })),
  ];
}

export function createHlsLevelQualityId(levelIndex: number): string {
  return `level:${levelIndex}`;
}

export function parseHlsQualityId(qualityId: string): number | null {
  if (qualityId === hlsAutoQualityId) {
    return -1;
  }
  if (!qualityId.startsWith("level:")) {
    return null;
  }
  const levelIndex = Number.parseInt(qualityId.slice(6), 10);
  if (Number.isInteger(levelIndex) && levelIndex >= 0) {
    return levelIndex;
  }
  return null;
}

export function selectHlsQualityOption(
  options: VibePlayerQualityOption[],
  qualityId: string
): VibePlayerQualityOption[] {
  return options.map((option) => ({
    ...option,
    selected: option.id === qualityId,
  }));
}

function createHlsQualityLabel(level: ManagedHlsLevel, index: number): string {
  if (level.name) {
    return normalizeHlsQualityName(level.name);
  }
  if (Number.isFinite(level.height) && level.height > 0) {
    return `${level.height}p`;
  }
  if (Number.isFinite(level.bitrate) && level.bitrate > 0) {
    return `${Math.round(level.bitrate / 1000)} kbps`;
  }
  return `Level ${index + 1}`;
}

function normalizeHlsQualityName(name: string): string {
  const trimmedName = name.trim();
  if (numericQualityNamePattern.test(trimmedName)) {
    return `${trimmedName}p`;
  }
  return trimmedName;
}

function createQualityMetadata(
  level: ManagedHlsLevel
): Pick<VibePlayerQualityOption, "bitrate" | "height"> {
  return {
    ...(Number.isFinite(level.bitrate) && level.bitrate > 0
      ? { bitrate: level.bitrate }
      : {}),
    ...(Number.isFinite(level.height) && level.height > 0
      ? { height: level.height }
      : {}),
  };
}
