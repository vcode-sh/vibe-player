import type { VibePlayerEventName } from "../../core/vibe-player-types";
import { createAdapterFullscreen } from "../shared/adapter-fullscreen";
import {
  enterNativePictureInPicture,
  exitNativePictureInPicture,
  isNativePictureInPicture,
} from "./native-picture-in-picture";

const pictureEvents = [
  "enterpictureinpicture",
  "leavepictureinpicture",
  "webkitpresentationmodechanged",
];

const owners = new WeakMap<HTMLVideoElement, NativeVideoPresentation>();

/** Native presentation owns event subscriptions independently from source loading. */
export class NativeVideoPresentation {
  readonly fullscreen;
  private readonly emit: (type: VibePlayerEventName) => void;
  private pictureInPicture = false;
  private video: HTMLVideoElement | null = null;

  constructor(emit: (type: VibePlayerEventName) => void) {
    this.emit = emit;
    this.fullscreen = createAdapterFullscreen(emit);
  }

  getSnapshot() {
    return {
      isFullscreen: this.fullscreen.isFullscreen,
      isPictureInPicture: Boolean(
        this.video &&
          owners.get(this.video) === this &&
          isNativePictureInPicture(this.video)
      ),
    };
  }

  mount(video: HTMLVideoElement, target: HTMLElement): void {
    if (video !== this.video || owners.get(video) !== this) {
      const previous = this.video;
      this.removePictureListeners();
      if (previous && owners.get(previous) === this) {
        owners.delete(previous);
      }
      this.video = video;
      owners.set(video, this);
      this.pictureInPicture = isNativePictureInPicture(video);
      for (const event of pictureEvents) {
        video.addEventListener(event, this.handlePictureChange);
      }
      if (previous !== video) {
        this.releasePicture(previous).catch(() => undefined);
      }
    }
    this.fullscreen.mount(target);
  }

  async enterPictureInPicture(): Promise<void> {
    const { video } = this;
    if (!video || owners.get(video) !== this) {
      return;
    }
    await enterNativePictureInPicture(video);
    if (video !== this.video || owners.get(video) !== this) {
      await this.releasePicture(video).catch(() => undefined);
      return;
    }
    this.handlePictureChange();
  }

  async exitPictureInPicture(): Promise<void> {
    await this.releasePicture(this.video);
    this.handlePictureChange();
  }

  async unmount(): Promise<void> {
    const { video } = this;
    this.removePictureListeners();
    if (video && owners.get(video) === this) {
      owners.delete(video);
    }
    this.video = null;
    this.pictureInPicture = false;
    await Promise.all([
      this.releasePicture(video).catch(() => undefined),
      this.fullscreen.unmount(),
    ]);
  }

  private async releasePicture(video: HTMLVideoElement | null): Promise<void> {
    const owner = video && owners.get(video);
    if (!owner || owner === this) {
      await exitNativePictureInPicture(video);
    }
  }

  private removePictureListeners(): void {
    for (const event of pictureEvents) {
      this.video?.removeEventListener(event, this.handlePictureChange);
    }
  }

  private readonly handlePictureChange = (): void => {
    const current = isNativePictureInPicture(this.video);
    if (
      this.video &&
      owners.get(this.video) === this &&
      current !== this.pictureInPicture
    ) {
      this.pictureInPicture = current;
      this.emit("pictureinpicturechange");
    }
  };
}
