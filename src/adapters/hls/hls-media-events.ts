import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
} from "../../core/vibe-player-types";
import { readNativeHlsLive } from "./hls-adapter-dom";
import { HlsAdapterSeekMarks } from "./hls-adapter-seek-marks";
import { HlsMediaDecodeRecovery } from "./hls-media-decode-recovery";
import type { ManagedHlsController } from "./hls-runtime-types";

type MediaEventPayload = VibePlayerAdapterEvent["payload"];

export interface HlsMediaEventsInput {
  emit: (type: VibePlayerEventName, payload?: MediaEventPayload) => void;
  getController: () => ManagedHlsController | null;
  setNativeLive: (isLive: boolean) => void;
}

/**
 * Translates the media element's events for the HLS adapter: native live
 * detection, decode failures recovered by the managed engine, and the
 * `internal` marks for seeks hls.js made itself.
 */
export class HlsMediaEvents {
  readonly decodeRecovery = new HlsMediaDecodeRecovery();
  readonly seekMarks = new HlsAdapterSeekMarks();
  private readonly input: HlsMediaEventsInput;

  constructor(input: HlsMediaEventsInput) {
    this.input = input;
  }

  handle(
    video: HTMLVideoElement,
    event: VibePlayerEventName,
    payload: MediaEventPayload
  ): void {
    const { emit, getController, setNativeLive } = this.input;
    const nativeLive = readNativeHlsLive(video, event);
    if (nativeLive !== null) {
      setNativeLive(nativeLive);
    }
    this.decodeRecovery.observe(video, event);
    const controller = getController();
    emit(
      event,
      event === "error"
        ? this.decodeRecovery.errorPayload(video, payload, controller)
        : (this.seekMarks.payload(event, video.currentTime, controller) ??
            payload)
    );
  }
}
