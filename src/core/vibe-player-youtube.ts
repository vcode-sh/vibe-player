import type { VibePlayerYouTubeSource } from "./vibe-player-types";

export interface VibePlayerYouTubeUrlInput {
  startSeconds?: number;
  youtubeVideoId: string;
}

export function getVibePlayerYouTubePresentation(
  source: VibePlayerYouTubeSource
): "external" | "iframe" {
  return source.presentation ?? "iframe";
}

export function createVibePlayerYouTubeWatchUrl(
  input: VibePlayerYouTubeUrlInput
): string {
  const params = new URLSearchParams({ v: input.youtubeVideoId });
  const startSeconds = getNormalizedYouTubeStartSeconds(input.startSeconds);
  if (startSeconds > 0) {
    params.set("t", `${startSeconds}s`);
  }
  return `https://www.youtube.com/watch?${params.toString()}`;
}

function getNormalizedYouTubeStartSeconds(value: number | undefined): number {
  if (typeof value !== "number" || !(Number.isFinite(value) && value > 0)) {
    return 0;
  }
  return Math.floor(value);
}
