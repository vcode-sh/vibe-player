import type {
  VibePlayerCaptionTrack,
  VibePlayerSource,
} from "./vibe-player-types";

function haveEqualCaptions(
  left: readonly VibePlayerCaptionTrack[] = [],
  right: readonly VibePlayerCaptionTrack[] = []
): boolean {
  return (
    left.length === right.length &&
    left.every((track, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        track.id === other.id &&
        track.default === other.default &&
        track.kind === other.kind &&
        track.label === other.label &&
        track.language === other.language &&
        track.url === other.url
      );
    })
  );
}

/** Source identity includes delivery URLs and metadata, not only the host ID. */
export function haveEqualVibePlayerSources(
  left: VibePlayerSource | null,
  right: VibePlayerSource | null
): boolean {
  if (left === right) {
    return true;
  }
  if (
    !(left && right) ||
    left.id !== right.id ||
    left.type !== right.type ||
    left.width !== right.width ||
    left.height !== right.height ||
    left.durationSeconds !== right.durationSeconds ||
    left.expiresAt !== right.expiresAt ||
    left.title !== right.title ||
    left.posterUrl !== right.posterUrl
  ) {
    return false;
  }
  if (left.type === "file" && right.type === "file") {
    return (
      left.autoPlay === right.autoPlay &&
      left.crossOrigin === right.crossOrigin &&
      haveEqualCaptions(left.captions, right.captions) &&
      left.sources.length === right.sources.length &&
      left.sources.every((media, index) => {
        const other = right.sources[index];
        return media.url === other?.url && media.mimeType === other?.mimeType;
      })
    );
  }
  if (left.type === "hls" && right.type === "hls") {
    return (
      left.manifestUrl === right.manifestUrl &&
      left.url === right.url &&
      left.crossOrigin === right.crossOrigin &&
      left.live === right.live &&
      haveEqualCaptions(left.captions, right.captions)
    );
  }
  if (left.type === "mp4" && right.type === "mp4") {
    return (
      left.url === right.url &&
      left.autoPlay === right.autoPlay &&
      left.crossOrigin === right.crossOrigin &&
      haveEqualCaptions(left.captions, right.captions)
    );
  }
  // Only an untyped caller reaches here with an unknown type: never reuse it.
  return false;
}
