import type { VibePlayerAdapter, VibePlayerSource } from "../core";
import { createFileAdapter } from "./file";
import { createHlsAdapter } from "./hls";
import type { HlsAdapterOptions } from "./hls/hls-runtime-types";

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
    default:
      throw new Error("No adapter is available for this source.");
  }
}
