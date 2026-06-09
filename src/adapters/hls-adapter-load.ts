import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerHlsSource,
} from "../core/vibe-player-types";
import { canUseNativeHls, setHlsVideoSource } from "./hls-adapter-dom";
import type { ManagedHlsLevel } from "./hls-quality";
import type {
  HlsAdapterRuntime,
  ManagedHlsController,
} from "./hls-runtime-types";

export interface LoadHlsAdapterSourceInput {
  emit: (
    type: VibePlayerEventName,
    payload?: VibePlayerAdapterEvent["payload"]
  ) => void;
  isActive: () => boolean;
  runtime: HlsAdapterRuntime;
  setLive: (isLive: boolean) => void;
  source: VibePlayerHlsSource;
  updateQualityOptions: (
    levels: ManagedHlsLevel[],
    selectedLevelIndex: number
  ) => void;
  video: HTMLVideoElement;
}

export async function loadHlsAdapterSource({
  emit,
  isActive,
  runtime,
  setLive,
  source,
  updateQualityOptions,
  video,
}: LoadHlsAdapterSourceInput): Promise<ManagedHlsController | null> {
  const managedHls = runtime.canUseManagedHls();
  const nativeHls = canUseNativeHls(video);
  if (!(nativeHls || managedHls)) {
    throw new Error("HLS playback requires native HLS or MediaSource support.");
  }
  setHlsVideoSource(video, source, managedHls ? "managed" : "native");
  if (!managedHls) {
    video.load();
    emit("ready");
    return null;
  }

  video.load();
  try {
    return await runtime.attachManagedHls({
      manifestUrl: source.manifestUrl,
      onError: (payload) => emit("error", payload),
      onLevelLoaded: (isLive) => {
        setLive(isLive);
        emit("durationchange");
      },
      onLevelsChanged: updateQualityOptions,
      onReady: () => emit("ready"),
      video,
    });
  } catch (error) {
    if (!isActive()) {
      return null;
    }
    if (!nativeHls) {
      throw error;
    }
    setHlsVideoSource(video, source, "native");
    video.load();
    emit("ready");
    return null;
  }
}
