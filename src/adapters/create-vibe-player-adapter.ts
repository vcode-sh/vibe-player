import type { VibePlayerAdapter, VibePlayerSource } from "../core";
import { getVibePlayerYouTubePresentation } from "../core";
import { createFileAdapter } from "./file";
import { createHlsAdapter } from "./hls";
import { createYouTubeAdapter, createYouTubeExternalAdapter } from "./youtube";

/** Selects a built-in adapter without requiring provider setup in the host. */
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
