import type { VibePlayerHlsSource } from "../core/vibe-player-types";
import type {
  HlsAdapterRuntime,
  ManagedHlsController,
  ManagedHlsSession,
} from "./hls-runtime-types";

export const hlsSource: VibePlayerHlsSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "https://example.com/captions.vtt",
    },
  ],
  id: "hls-video",
  manifestUrl: "https://example.com/stream.m3u8",
  posterUrl: "https://example.com/poster.jpg",
  title: "HLS video",
  type: "hls",
};

export interface HlsRuntimeProbe {
  attachCount: number;
  qualityLevel: number;
  session: ManagedHlsSession | null;
  teardownCount: number;
}

export interface DeferredManagedHlsController {
  promise: Promise<ManagedHlsController>;
  resolve: (controller: ManagedHlsController) => void;
}

export interface DeferredManagedHlsFailure {
  promise: Promise<ManagedHlsController>;
  reject: (error: Error) => void;
}

export function createDeferredManagedHlsController(): DeferredManagedHlsController {
  let resolveController: ((controller: ManagedHlsController) => void) | null =
    null;
  const promise = new Promise<ManagedHlsController>((resolve) => {
    resolveController = resolve;
  });

  return {
    promise,
    resolve: (controller) => {
      if (!resolveController) {
        throw new Error("Managed HLS controller resolver was not initialized.");
      }
      resolveController(controller);
    },
  };
}

export function createDeferredManagedHlsFailure(): DeferredManagedHlsFailure {
  let rejectController: ((error: Error) => void) | null = null;
  const promise = new Promise<ManagedHlsController>((_resolve, reject) => {
    rejectController = reject;
  });

  return {
    promise,
    reject: (error) => {
      if (!rejectController) {
        throw new Error("Managed HLS failure rejecter was not initialized.");
      }
      rejectController(error);
    },
  };
}

export function createHlsRuntime(canUseManagedHls = true): {
  probe: HlsRuntimeProbe;
  runtime: HlsAdapterRuntime;
} {
  const probe: HlsRuntimeProbe = {
    attachCount: 0,
    qualityLevel: -1,
    session: null,
    teardownCount: 0,
  };
  return {
    probe,
    runtime: {
      attachManagedHls(session) {
        probe.attachCount += 1;
        probe.session = session;
        return {
          destroy: () => {
            probe.teardownCount += 1;
          },
          setQualityLevel: (levelIndex) => {
            probe.qualityLevel = levelIndex;
          },
        };
      },
      canUseManagedHls: () => canUseManagedHls,
    },
  };
}

export function getManagedSession(probe: HlsRuntimeProbe): ManagedHlsSession {
  if (!probe.session) {
    throw new Error("Expected managed HLS session.");
  }
  return probe.session;
}
