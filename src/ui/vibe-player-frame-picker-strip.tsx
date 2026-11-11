import { useEffect, useRef, useState } from "react";
import { selectVibePlayerSeekThumbnail } from "./select-vibe-player-seek-thumbnail";
import { VibePlayerSeekThumbnailImage } from "./vibe-player-seek-thumbnail";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import { vibePlayerClassName } from "./vibe-player-ui-context";

const maxTiles = 40;

interface VibePlayerFramePickerStripProps {
  className?: string | undefined;
  duration: number;
  seekThumbnails: readonly VibePlayerSeekThumbnail[];
  /** Tile ratio when the storyboard tiles carry no sprite size. */
  videoRatio: number;
}

/** Tiles at their own ratio fill the strip; the last one may be clipped. */
function countTiles(width: number, height: number, ratio: number): number {
  if (!(width > 0 && height > 0 && ratio > 0)) {
    return 0;
  }
  return Math.min(maxTiles, Math.ceil(width / (height * ratio)));
}

/**
 * The filmstrip behind the frame picker rail: storyboard tiles side by side,
 * each the frame at its slot's middle. It measures itself, so the tile count
 * follows the rail's size.
 */
export function VibePlayerFramePickerStrip({
  className,
  duration,
  seekThumbnails,
  videoRatio,
}: VibePlayerFramePickerStripProps) {
  const root = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }
    const measure = () =>
      setSize({ height: element.clientHeight, width: element.clientWidth });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const sprite = seekThumbnails.find((thumbnail) => thumbnail.sprite)?.sprite;
  const ratio = sprite ? sprite.width / sprite.height : videoRatio;
  const count = countTiles(size.width, size.height, ratio);
  const slot = size.height * ratio;
  return (
    <span
      aria-hidden
      className={vibePlayerClassName(
        "vibe-player-frame-picker__strip",
        className
      )}
      data-part="strip"
      ref={root}
    >
      {Array.from({ length: count }, (_, index) => {
        // The frame under the slot's middle.
        const time = Math.min(
          duration,
          (((index + 0.5) * slot) / size.width) * duration
        );
        const tile = selectVibePlayerSeekThumbnail(
          seekThumbnails,
          time,
          duration
        );
        return (
          <span
            className="vibe-player-frame-picker__strip-slot"
            // biome-ignore lint/suspicious/noArrayIndexKey: Slots are positional; the tile inside is keyed by its image.
            key={index}
            style={{ width: `${slot}px` }}
          >
            {tile ? (
              <VibePlayerSeekThumbnailImage
                className="vibe-player-frame-picker__strip-tile"
                key={tile.url}
                thumbnail={tile}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
