import type { VibePlayerAdapter, VibePlayerSource } from "../core";
import { getVibePlayerYouTubePresentation } from "../core";
import { createFileAdapter } from "./file";
import { createHlsAdapter } from "./hls";
import type { HlsAdapterOptions } from "./hls/hls-runtime-types";
import { createYouTubeAdapter, createYouTubeExternalAdapter } from "./youtube";

export interface VibePlayerAdapterOptions extends HlsAdapterOptions {}

/** Selects a built-in adapter without requiring provider setup in the host. */
export function createVibePlayerAdapter(
  source: VibePlayerSource,
  options: VibePlayerAdapterOptions = {}
): VibePlayerAdapter {
  switch (source.type) {
    case "file":
    case "mp4":
      return createFileAdapter();
    case "hls":
      return createHlsAdapter(options);
    case "youtube":
      if (getVibePlayerYouTubePresentation(source) === "external") {
        return createYouTubeExternalAdapter();
      }
      return createYouTubeAdapter();
    default:
      throw new Error("No adapter is available for this source.");
  }
}
