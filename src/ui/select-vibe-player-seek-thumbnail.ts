import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

function isValidThumbnail(thumbnail: VibePlayerSeekThumbnail): boolean {
  const { startTime, endTime, sprite, url } = thumbnail;
  if (
    !(Number.isFinite(startTime) && Number.isFinite(endTime)) ||
    startTime < 0 ||
    endTime <= startTime ||
    url.trim().length === 0
  ) {
    return false;
  }
  return (
    !sprite ||
    (Number.isFinite(sprite.x) &&
      Number.isFinite(sprite.y) &&
      Number.isFinite(sprite.width) &&
      Number.isFinite(sprite.height) &&
      sprite.x >= 0 &&
      sprite.y >= 0 &&
      sprite.width > 0 &&
      sprite.height > 0)
  );
}

export function selectVibePlayerSeekThumbnail(
  thumbnails: readonly VibePlayerSeekThumbnail[] | undefined,
  time: number,
  duration: number
): VibePlayerSeekThumbnail | undefined {
  if (!Number.isFinite(time) || time < 0 || time > duration) {
    return undefined;
  }
  return thumbnails?.find(
    (thumbnail) =>
      isValidThumbnail(thumbnail) &&
      time >= thumbnail.startTime &&
      (time < thumbnail.endTime ||
        (time === duration && thumbnail.endTime === duration))
  );
}
