import { createVibePlayerYouTubeWatchUrl } from "../../core";
import type { VibePlayerYouTubeSource } from "../../core/vibe-player-types";

export function createYouTubeExternalElement(
  source: VibePlayerYouTubeSource
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.ariaLabel = getYouTubeExternalLabel(source);
  link.className = "vibe-player-youtube-external";
  link.href = createVibePlayerYouTubeWatchUrl(source);
  link.rel = "noopener";
  link.target = "_blank";
  link.append(
    createYouTubeExternalMedia(source),
    createYouTubeExternalContent(source)
  );
  return link;
}

function createYouTubeExternalMedia(
  source: VibePlayerYouTubeSource
): HTMLElement {
  const media = document.createElement("span");
  media.className = "vibe-player-youtube-external__media";
  if (!source.posterUrl) {
    return media;
  }
  const image = document.createElement("img");
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;
  image.src = source.posterUrl;
  media.append(image);
  return media;
}

function createYouTubeExternalContent(
  source: VibePlayerYouTubeSource
): HTMLElement {
  const content = document.createElement("span");
  content.className = "vibe-player-youtube-external__content";
  const badge = document.createElement("span");
  badge.className = "vibe-player-youtube-external__badge";
  badge.textContent = "YouTube";
  const title = document.createElement("span");
  title.className = "vibe-player-youtube-external__title";
  title.textContent = source.title ?? "YouTube video";
  const action = document.createElement("span");
  action.className = "vibe-player-youtube-external__action";
  action.textContent = source.externalActionLabel ?? "Watch on YouTube";
  content.append(badge, title, action);
  return content;
}

function getYouTubeExternalLabel(source: VibePlayerYouTubeSource): string {
  if (source.title) {
    return `Watch ${source.title} on YouTube`;
  }
  return source.externalActionLabel ?? "Watch on YouTube";
}
