import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerHlsSource,
} from "../../core/vibe-player-types";
import { loadHlsAdapterSource } from "./hls-adapter-load";
import type { ManagedHlsLevel } from "./hls-quality";
import type {
  HlsAdapterRuntime,
  ManagedHlsController,
} from "./hls-runtime-types";

export interface HlsAdapterLoadSession {
  generation: number;
}

export interface LoadCurrentHlsAdapterSourceInput {
  emit: (
    type: VibePlayerEventName,
    payload?: VibePlayerAdapterEvent["payload"]
  ) => void;
  isCurrentLoadSession: (loadSession: HlsAdapterLoadSession) => boolean;
  loadSession: HlsAdapterLoadSession;
  /** Returns how to resume playback after the engine resets the media. */
  onMediaRecovery: () => (() => void) | undefined;
  runtime: HlsAdapterRuntime;
  setLive: (isLive: boolean) => void;
  source: VibePlayerHlsSource;
  updateQualityOptions: (
    levels: ManagedHlsLevel[],
    selectedLevelIndex: number
  ) => void;
  video: HTMLVideoElement;
}

export async function loadCurrentHlsAdapterSource({
  emit,
  isCurrentLoadSession,
  loadSession,
  onMediaRecovery,
  runtime,
  setLive,
  source,
  updateQualityOptions,
  video,
}: LoadCurrentHlsAdapterSourceInput): Promise<ManagedHlsController | null> {
  let managedController: ManagedHlsController | null = null;
  try {
    managedController = await loadHlsAdapterSource({
      emit: (type, payload) => {
        if (isCurrentLoadSession(loadSession)) {
          emit(type, payload);
        }
      },
      isActive: () => isCurrentLoadSession(loadSession),
      onMediaRecovery: () =>
        isCurrentLoadSession(loadSession) ? onMediaRecovery() : undefined,
      runtime,
      setLive: (isLive) => {
        if (isCurrentLoadSession(loadSession)) {
          setLive(isLive);
        }
      },
      source,
      updateQualityOptions: (levels, selectedLevelIndex) => {
        if (isCurrentLoadSession(loadSession)) {
          updateQualityOptions(levels, selectedLevelIndex);
        }
      },
      video,
    });
  } catch (error) {
    if (isCurrentLoadSession(loadSession)) {
      throw error;
    }
    return null;
  }

  if (!isCurrentLoadSession(loadSession)) {
    managedController?.destroy();
    return null;
  }
  return managedController;
}
