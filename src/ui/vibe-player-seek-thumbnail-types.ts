/** Pixel rectangle within the original, unscaled thumbnail sprite image. */
export interface VibePlayerSeekThumbnailSprite {
  height: number;
  width: number;
  x: number;
  y: number;
}

/** Host-provided seek image for a time interval, measured in seconds. */
export interface VibePlayerSeekThumbnail {
  /** Exclusive end; also selected at the exact media duration when equal. */
  endTime: number;
  /** Omit for a standalone frame image. */
  sprite?: VibePlayerSeekThumbnailSprite;
  /** Inclusive interval start. */
  startTime: number;
  url: string;
}
