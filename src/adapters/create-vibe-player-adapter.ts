import type { VibePlayerAdapter, VibePlayerSource } from "../core";
import { getVibePlayerYouTubePresentation } from "../core";
import { createFileAdapter } from "./create-file-adapter";
import { createHlsAdapter } from "./create-hls-adapter";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import { createYouTubeExternalAdapter } from "./create-youtube-external-adapter";

export function createVibePlayerAdapter(
  source: VibePlayerSource
): VibePlayerAdapter {
  switch (source.type) {
    case "file":
      return createFileAdapter();
    case "hls":
      return createHlsAdapter();
    case "youtube":
      if (getVibePlayerYouTubePresentation(source) === "external") {
        return createYouTubeExternalAdapter();
      }
      return createYouTubeAdapter();
    default:
      throw new Error("No adapter is available for this source.");
  }
}
