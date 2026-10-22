import type { VibePlayerYouTubeSource } from "../../core/vibe-player-types";

// Package-owned controls are the embedded default; native is an explicit opt-in.
export function getYouTubeControlsMode(
  source: VibePlayerYouTubeSource
): "custom" | "native" {
  return source.controls ?? "custom";
}
