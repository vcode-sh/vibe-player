import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

/** A storyboard sprite sheet of equal tiles, left to right, row by row. */
export interface VibePlayerSeekThumbnailGrid {
  columns: number;
  /** Number of tiles in the sheet. */
  count: number;
  /** Media duration; the last tile then reaches it. */
  duration?: number | undefined;
  /** Tile height in original image pixels. */
  height: number;
  /** Seconds per tile: tile `n` covers `[n * interval, (n + 1) * interval)`. */
  interval: number;
  url: string;
  /** Tile width in original image pixels. */
  width: number;
}

/** Seek thumbnails for every tile of a storyboard sprite sheet. */
export function createVibePlayerSeekThumbnails({
  columns,
  count,
  duration = 0,
  height,
  interval,
  url,
  width,
}: VibePlayerSeekThumbnailGrid): VibePlayerSeekThumbnail[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    endTime:
      index === count - 1
        ? Math.max(duration, count * interval)
        : (index + 1) * interval,
    sprite: {
      height,
      width,
      x: (index % columns) * width,
      y: Math.floor(index / columns) * height,
    },
    startTime: index * interval,
    url,
  }));
}

const blockSeparator = /\r?\n\r?\n/;
const lineBreak = /\r?\n/;
const timing =
  /^\s*((?:\d+:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}\.\d{3})/;
const fragment = /#xywh=(?:pixel:)?(\d+),(\d+),(\d+),(\d+)$/;

function seconds(stamp: string): number {
  return stamp.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

/**
 * Seek thumbnails from a WebVTT thumbnail track, whose cues name an image or
 * a sprite tile (`sheet.jpg#xywh=x,y,w,h`). Relative URLs resolve against
 * `baseUrl`, normally the track's own URL. Fetching stays with the host.
 */
export function parseVibePlayerSeekThumbnailsVtt(
  text: string,
  baseUrl?: string
): VibePlayerSeekThumbnail[] {
  const thumbnails: VibePlayerSeekThumbnail[] = [];
  for (const block of text.split(blockSeparator)) {
    const lines = block.split(lineBreak);
    const at = lines.findIndex((line) => timing.test(line));
    const match = timing.exec(lines[at] ?? "");
    const target = lines[at + 1]?.trim();
    if (!(match?.[1] && match[2] && target)) {
      continue;
    }
    const tile = fragment.exec(target);
    const path = tile ? target.slice(0, tile.index) : target;
    thumbnails.push({
      endTime: seconds(match[2]),
      startTime: seconds(match[1]),
      url: baseUrl ? new URL(path, baseUrl).href : path,
      ...(tile && {
        sprite: {
          height: Number(tile[4]),
          width: Number(tile[3]),
          x: Number(tile[1]),
          y: Number(tile[2]),
        },
      }),
    });
  }
  return thumbnails;
}
