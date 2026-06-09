import type { ManagedHlsLevel } from "./hls-quality";
import type { HlsAdapterRuntime } from "./hls-runtime-types";

interface HlsLevelLike {
  bitrate?: number;
  height?: number;
  name?: string;
  width?: number;
}

export const defaultHlsAdapterRuntime: HlsAdapterRuntime = {
  async attachManagedHls(session) {
    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) {
      throw new Error("hls.js is not supported in this environment.");
    }
    const hls = new Hls();
    const syncLevels = (selectedLevelIndex: number) => {
      session.onLevelsChanged(
        hls.levels.map((level) => toManagedLevel(level)),
        selectedLevelIndex
      );
    };
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      syncLevels(hls.manualLevel);
      session.onReady();
    });
    hls.on(Hls.Events.LEVELS_UPDATED, () => syncLevels(hls.manualLevel));
    hls.on(Hls.Events.LEVEL_SWITCHED, () => syncLevels(hls.manualLevel));
    hls.on(Hls.Events.LEVEL_LOADED, (_event, data) =>
      session.onLevelLoaded(data.details.live)
    );
    hls.on(Hls.Events.ERROR, (_event, data) =>
      session.onError({
        details: data.details,
        fatal: data.fatal,
        message: data.error.message,
        type: data.type,
      })
    );
    hls.attachMedia(session.video);
    hls.loadSource(session.manifestUrl);
    return {
      destroy: () => hls.destroy(),
      setQualityLevel: (levelIndex) => {
        hls.currentLevel = levelIndex;
        syncLevels(levelIndex);
      },
    };
  },
  canUseManagedHls: () =>
    "ManagedMediaSource" in globalThis || "MediaSource" in globalThis,
};

function toManagedLevel(level: HlsLevelLike): ManagedHlsLevel {
  return {
    bitrate: level.bitrate ?? 0,
    height: level.height ?? 0,
    ...(level.name ? { name: level.name } : {}),
    ...(level.width ? { width: level.width } : {}),
  };
}
