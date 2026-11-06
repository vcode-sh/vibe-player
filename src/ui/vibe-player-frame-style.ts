import type { CSSProperties } from "react";
import type { VibePlayerSnapshot } from "../core/vibe-player-runtime-types";
import type { VibePlayerSource } from "../core/vibe-player-source-types";

interface VibePlayerFrameStyle extends CSSProperties {
  "--vibe-player-aspect-ratio"?: number;
}

interface VibePlayerFrameInput {
  maxRatio?: number | undefined;
  minRatio?: number | undefined;
  snapshot: VibePlayerSnapshot;
  source: VibePlayerSource;
  style?: CSSProperties | undefined;
}

export function getVibePlayerFrameStyle({
  maxRatio = 16 / 9,
  minRatio = 9 / 16,
  snapshot,
  source,
  style,
}: VibePlayerFrameInput): VibePlayerFrameStyle {
  const width = source.width ?? snapshot.videoWidth ?? 0;
  const height = source.height ?? snapshot.videoHeight ?? 0;
  const minimum = Number.isFinite(minRatio) && minRatio > 0 ? minRatio : 9 / 16;
  const maximum =
    Number.isFinite(maxRatio) && maxRatio >= minimum
      ? maxRatio
      : Math.max(minimum, 16 / 9);
  const measured = width > 0 && height > 0 ? width / height : 16 / 9;
  const ratio = Math.min(maximum, Math.max(minimum, measured));
  return { "--vibe-player-aspect-ratio": ratio, ...style };
}
