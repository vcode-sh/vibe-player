import type { VibePlayerEventName } from "../../core/vibe-player-types";
import {
  type AdapterFullscreen,
  createAdapterFullscreen,
} from "../shared/adapter-fullscreen";

interface WebKitFullscreenVideo extends HTMLVideoElement {
  webkitDisplayingFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
}

/**
 * iPhone Safari raises the `webkit*` pair; desktop WebKit reports the same
 * video-only fullscreen through a bubbling `fullscreenchange` on the video.
 */
const videoFullscreenEvents = [
  "fullscreenchange",
  "webkitbeginfullscreen",
  "webkitendfullscreen",
];

const owners = new WeakMap<HTMLVideoElement, NativeVideoFullscreen>();

function asWebKitVideo(video: HTMLVideoElement): WebKitFullscreenVideo {
  return video;
}

/** WebKit only allows this after metadata loads; it reports that readiness. */
function canEnterVideoFullscreen(video: HTMLVideoElement): boolean {
  const webkit = asWebKitVideo(video);
  return (
    typeof webkit.webkitEnterFullscreen === "function" &&
    webkit.webkitSupportsFullscreen !== false
  );
}

function isDisplayingVideoFullscreen(video: HTMLVideoElement | null): boolean {
  return Boolean(video && asWebKitVideo(video).webkitDisplayingFullscreen);
}

/**
 * Fullscreen prefers the presentation container, so package chrome stays
 * visible. Where the container cannot go fullscreen (iPhone Safari), the
 * video's own WebKit fullscreen is the fallback; fullscreen the platform
 * enters by other means is reported either way.
 */
export class NativeVideoFullscreen {
  private announcedState = false;
  private readonly container: AdapterFullscreen;
  private readonly emit: (type: VibePlayerEventName) => void;
  private video: HTMLVideoElement | null = null;

  constructor(emit: (type: VibePlayerEventName) => void) {
    this.emit = emit;
    this.container = createAdapterFullscreen(() => this.handleChange());
  }

  get canFullscreen(): boolean {
    if (this.container.canFullscreen) {
      return true;
    }
    const video = this.ownedVideo();
    return Boolean(video && canEnterVideoFullscreen(video));
  }

  get isFullscreen(): boolean {
    return (
      this.container.isFullscreen ||
      isDisplayingVideoFullscreen(this.ownedVideo())
    );
  }

  mount(video: HTMLVideoElement, target: HTMLElement): void {
    if (video !== this.video || owners.get(video) !== this) {
      const previous = this.video;
      this.removeVideoListeners();
      if (previous && owners.get(previous) === this) {
        owners.delete(previous);
      }
      this.video = video;
      owners.set(video, this);
      for (const event of videoFullscreenEvents) {
        video.addEventListener(event, this.handleChange);
      }
      if (previous !== video) {
        this.releaseVideo(previous);
      }
    }
    this.container.mount(target);
    this.announcedState = this.isFullscreen;
  }

  async enter(): Promise<void> {
    if (this.isFullscreen) {
      return;
    }
    if (this.container.canFullscreen) {
      await this.container.enter();
      return;
    }
    const video = this.ownedVideo();
    if (video && canEnterVideoFullscreen(video)) {
      asWebKitVideo(video).webkitEnterFullscreen?.();
      this.handleChange();
    }
  }

  async exit(): Promise<void> {
    if (this.container.isFullscreen) {
      await this.container.exit();
      return;
    }
    this.releaseVideo(this.ownedVideo());
    this.handleChange();
  }

  async unmount(): Promise<void> {
    const { video } = this;
    this.removeVideoListeners();
    if (video && owners.get(video) === this) {
      owners.delete(video);
    }
    this.video = null;
    this.announcedState = false;
    this.releaseVideo(video);
    await this.container.unmount();
  }

  private ownedVideo(): HTMLVideoElement | null {
    const { video } = this;
    return video && owners.get(video) === this ? video : null;
  }

  private releaseVideo(video: HTMLVideoElement | null): void {
    const owner = video && owners.get(video);
    if (
      video &&
      (!owner || owner === this) &&
      isDisplayingVideoFullscreen(video)
    ) {
      asWebKitVideo(video).webkitExitFullscreen?.();
    }
  }

  private removeVideoListeners(): void {
    for (const event of videoFullscreenEvents) {
      this.video?.removeEventListener(event, this.handleChange);
    }
  }

  private readonly handleChange = (): void => {
    const current = this.isFullscreen;
    if (this.video && current !== this.announcedState) {
      this.announcedState = current;
      this.emit("fullscreenchange");
    }
  };
}
