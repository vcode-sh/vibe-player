import { useState } from "react";
import type {
  VibePlayerSeekThumbnail,
  VibePlayerSeekThumbnailSprite,
} from "./vibe-player-seek-thumbnail-types";

interface ImageSize {
  height: number;
  width: number;
}

interface VibePlayerSeekThumbnailImageProps {
  thumbnail: VibePlayerSeekThumbnail;
}

function getThumbnailImageStyle(
  size: ImageSize | null,
  crop: VibePlayerSeekThumbnailSprite
) {
  if (!(size && crop.width > 0 && crop.height > 0)) {
    return;
  }
  return {
    left: `${(-100 * crop.x) / crop.width}%`,
    top: `${(-100 * crop.y) / crop.height}%`,
    width: `${(100 * size.width) / crop.width}%`,
  };
}

// The parent keys this image by URL so late load/error events cannot reveal a
// previous image while a different URL is loading.
export function VibePlayerSeekThumbnailImage({
  thumbnail,
}: VibePlayerSeekThumbnailImageProps) {
  const [size, setSize] = useState<ImageSize | null>(null);
  const [failed, setFailed] = useState(false);
  const { sprite, url } = thumbnail;
  const crop = sprite ?? { x: 0, y: 0, ...(size ?? { height: 0, width: 0 }) };
  const { width, height } = crop;
  const visible =
    size !== null &&
    width > 0 &&
    height > 0 &&
    crop.x + width <= size.width &&
    crop.y + height <= size.height;
  if (failed) {
    return null;
  }
  return (
    <span
      aria-hidden
      className="vibe-player-seek-thumbnail"
      hidden={!visible}
      style={{
        aspectRatio: `${width} / ${height}`,
        width:
          height > 0
            ? `min(100%, calc(var(--vibe-player-seek-thumbnail-height, 90px) * ${width / height}))`
            : 0,
      }}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: load/error only observe image availability. */}
      <img
        alt=""
        draggable={false}
        height={size?.height}
        onError={() => setFailed(true)}
        onLoad={(event) => {
          const image = event.currentTarget;
          setSize({ height: image.naturalHeight, width: image.naturalWidth });
        }}
        src={url}
        style={getThumbnailImageStyle(size, crop)}
        width={size?.width}
      />
    </span>
  );
}
