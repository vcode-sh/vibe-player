import { selectVibePlayerSeekThumbnail } from "./select-vibe-player-seek-thumbnail";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import type { VibePlayerTimelinePreview } from "./vibe-player-timeline-preview";

export interface VibePlayerHeatmapPreviewOptions {
  duration: number;
  formatTime: (seconds: number) => string;
  /** The chip label at a fraction: "Most replayed", a host value, or "". */
  label: (fraction: number) => string;
  preview: VibePlayerTimelinePreview;
  seekThumbnails: readonly VibePlayerSeekThumbnail[] | undefined;
  /** The dot's vertical position (0..100) at a fraction. */
  y: (fraction: number) => number;
}

interface Bounds {
  max: number;
  min: number;
  width: number;
}

/** Keeps the preview 8 px inside the player it belongs to. */
function measure(root: HTMLElement): Bounds {
  const box = root.getBoundingClientRect();
  const player = (
    root.closest(".vibe-player-stage") ?? root
  ).getBoundingClientRect();
  return {
    max: player.right - box.left - 8,
    min: player.left - box.left + 8,
    width: box.width,
  };
}

function part<T extends Element>(root: HTMLElement, name: string): T | null {
  return root.querySelector<T>(`.vibe-player-heatmap__${name}`);
}

/** Positions a sprite tile (or a whole frame) inside the frame box. */
function showFrame(
  frame: HTMLElement,
  image: HTMLImageElement,
  thumbnail: VibePlayerSeekThumbnail | undefined
): void {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const loaded =
    image.complete && width > 0 && image.getAttribute("src") === thumbnail?.url;
  const crop = thumbnail?.sprite ?? { height, width, x: 0, y: 0 };
  frame.hidden = !(
    loaded &&
    crop.x + crop.width <= width &&
    crop.y + crop.height <= height
  );
  if (frame.hidden) {
    return;
  }
  frame.style.aspectRatio = `${crop.width} / ${crop.height}`;
  image.style.width = `${(100 * width) / crop.width}%`;
  image.style.left = `${(-100 * crop.x) / crop.width}%`;
  image.style.top = `${(-100 * crop.y) / crop.height}%`;
}

/**
 * Drives the dot, frame, time and label from the timeline preview through
 * the DOM, so pointer moves never re-render React. Returns the cleanup.
 */
export function bindVibePlayerHeatmapPreview(
  root: HTMLElement,
  options: VibePlayerHeatmapPreviewOptions
): () => void {
  const rider = part<HTMLElement>(root, "rider");
  const box = part<HTMLElement>(root, "preview");
  const frame = part<HTMLElement>(root, "frame");
  const image = frame?.querySelector("img");
  const time = part<HTMLElement>(root, "time");
  const label = part<HTMLElement>(root, "label");
  if (!(box && frame && image && time && label)) {
    return () => undefined;
  }
  const failed = new Set<string>();
  let bounds: Bounds | null = null;
  const update = () => {
    const { fraction } = options.preview;
    const active = fraction !== null && options.duration > 0;
    root.toggleAttribute("data-active", active);
    if (!active) {
      bounds = null;
      return;
    }
    bounds ??= measure(root);
    const seconds = fraction * options.duration;
    const thumbnail = selectVibePlayerSeekThumbnail(
      options.seekThumbnails,
      seconds,
      options.duration
    );
    const url = thumbnail && !failed.has(thumbnail.url) ? thumbnail.url : "";
    if (url && image.getAttribute("src") !== url) {
      image.src = url;
    }
    showFrame(frame, image, url ? thumbnail : undefined);
    time.textContent = options.formatTime(seconds);
    label.textContent = options.label(fraction);
    if (rider) {
      rider.style.transform = `translate(${fraction * 100}%, ${options.y(fraction)}%)`;
    }
    const half = box.offsetWidth / 2;
    const centre = fraction * bounds.width;
    const x =
      bounds.max - bounds.min < 2 * half
        ? (bounds.min + bounds.max) / 2
        : Math.min(bounds.max - half, Math.max(bounds.min + half, centre));
    box.style.transform = `translateX(${x - half}px)`;
  };
  const fail = () => {
    failed.add(image.getAttribute("src") ?? "");
    update();
  };
  image.addEventListener("load", update);
  image.addEventListener("error", fail);
  const unsubscribe = options.preview.subscribe(update);
  update();
  return () => {
    unsubscribe();
    image.removeEventListener("load", update);
    image.removeEventListener("error", fail);
  };
}
