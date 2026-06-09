import {
  createIdleCapabilities,
  createIdleSnapshot,
  createVibePlayerYouTubeWatchUrl,
  getVibePlayerYouTubePresentation,
} from "../core";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
  VibePlayerSource,
  VibePlayerYouTubeSource,
} from "../core/vibe-player-types";
import type { VibePlayerAdapterListener } from "./adapter-listener";
import { clearElement } from "./native-video-dom";

export function createYouTubeExternalAdapter(): VibePlayerAdapter {
  return new YouTubeExternalAdapter();
}

class YouTubeExternalAdapter implements VibePlayerAdapter {
  readonly capabilities: VibePlayerCapabilities = createIdleCapabilities();
  readonly kind = "youtube";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private element: HTMLAnchorElement | null = null;
  private snapshot: VibePlayerSnapshot = createIdleSnapshot();
  private target: HTMLElement | null = null;

  getSnapshot(): VibePlayerSnapshot {
    return this.snapshot;
  }

  load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "youtube") {
      return Promise.reject(
        new Error(
          `YouTube external adapter cannot load ${source.type} sources.`
        )
      );
    }
    if (getVibePlayerYouTubePresentation(source) !== "external") {
      return Promise.reject(
        new Error("YouTube external adapter requires external presentation.")
      );
    }
    this.element = createYouTubeExternalElement(source);
    this.snapshot = { ...createIdleSnapshot(), readyState: "ready" };
    this.syncMountedElement();
    this.emit("ready");
    return Promise.resolve();
  }

  mount(target: HTMLElement): Promise<void> {
    this.target = target;
    this.syncMountedElement();
    if (this.element) {
      this.emit("ready");
    }
    return Promise.resolve();
  }

  pause(): Promise<void> {
    return Promise.resolve();
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  seekTo(): Promise<void> {
    return Promise.resolve();
  }

  setMuted(): Promise<void> {
    return Promise.resolve();
  }

  setPlaybackRate(): Promise<void> {
    return Promise.resolve();
  }

  setVolume(): Promise<void> {
    return Promise.resolve();
  }

  subscribe(listener: VibePlayerAdapterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  unmount(): Promise<void> {
    this.element?.remove();
    this.element = null;
    this.snapshot = createIdleSnapshot();
    this.target = null;
    return Promise.resolve();
  }

  private syncMountedElement(): void {
    if (!this.target) {
      return;
    }
    clearElement(this.target);
    if (this.element) {
      this.target.append(this.element);
    }
  }

  private emit(type: VibePlayerEventName): void {
    const event: VibePlayerAdapterEvent = {
      snapshot: this.snapshot,
      type,
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function createYouTubeExternalElement(
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
