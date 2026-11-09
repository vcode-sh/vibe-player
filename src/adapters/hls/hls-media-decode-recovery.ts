import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
} from "../../core/vibe-player-types";
import { isNativeHlsVideo } from "./hls-adapter-dom";
import type { ManagedHlsController } from "./hls-runtime-types";

type MediaErrorPayload = VibePlayerAdapterEvent["payload"];

/** `MediaError.MEDIA_ERR_DECODE`. */
const mediaErrorDecode = 3;

/**
 * A managed (MSE) decode failure surfaces only as the media element's own
 * `error` (`MEDIA_ERR_DECODE`); hls.js does not report it. While an engine is
 * attached it enters the same recovery ladder as hls.js media errors and is
 * reported nonfatal. The element pauses as it fails, so whether it played
 * before that comes from the events seen up to the failure.
 */
export class HlsMediaDecodeRecovery {
  private playing = false;
  private recovering = false;

  /** True only while a decode failure of playing media starts its recovery. */
  get playingAtRecovery(): boolean {
    return this.recovering;
  }

  observe(video: HTMLVideoElement, event: VibePlayerEventName): void {
    if (event !== "error") {
      this.playing = !video.paused;
    }
  }

  errorPayload(
    video: HTMLVideoElement,
    payload: MediaErrorPayload,
    controller: ManagedHlsController | null
  ): MediaErrorPayload {
    const nativeHls = isNativeHlsVideo(video);
    const recovered =
      !nativeHls &&
      video.error?.code === mediaErrorDecode &&
      this.recover(controller);
    return { ...payload, nativeHls, ...(recovered ? { fatal: false } : {}) };
  }

  private recover(controller: ManagedHlsController | null): boolean {
    this.recovering = this.playing;
    try {
      return controller?.recoverMediaError?.() === true;
    } finally {
      this.recovering = false;
    }
  }
}
