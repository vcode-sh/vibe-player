import {
  createIdleCapabilities,
  createIdleSnapshot,
  getVibePlayerYouTubePresentation,
} from "../../core/index";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../../core/vibe-player-types";
import type { VibePlayerAdapterListener } from "../shared/adapter-listener";
import { clearElement } from "../shared/clear-element";
import { createYouTubeExternalElement } from "./youtube-external-element";

/** Creates an external YouTube handoff with no iframe or playback controls. */
export function createYouTubeExternalAdapter(): VibePlayerAdapter {
  return new YouTubeExternalAdapter();
}

class YouTubeExternalAdapter implements VibePlayerAdapter {
  readonly capabilities: VibePlayerCapabilities = {
    ...createIdleCapabilities(),
    keepsControlsVisible: true,
  };
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
