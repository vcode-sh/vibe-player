import { canUseNativeHls } from "./hls-adapter-dom";
import { createInlineHlsConfig } from "./hls-engine-config";
import { ManagedHlsInternalSeeks } from "./hls-internal-seeks";
import {
  bindManagedHlsEvents,
  syncManagedHlsLevels,
} from "./hls-managed-events";
import { ManagedHlsMediaRecovery } from "./hls-media-recovery";
import { createHlsRequestConfig } from "./hls-request-config";
import type {
  HlsAdapterOptions,
  HlsAdapterRuntime,
  ManagedHlsController,
  ManagedHlsSession,
} from "./hls-runtime-types";

/** Prefer classic MSE; native HLS preserves remote playback on iPhone MMS-only. */
export function createHlsAdapterRuntime(
  options: HlsAdapterOptions = {}
): HlsAdapterRuntime {
  return {
    attachManagedHls: (session) => attachManagedHls(session, options),
    canUseManagedHls: (video) =>
      hasClassicMediaSource() ||
      (hasManagedMediaSource() && !(video && canUseNativeHls(video))),
  };
}

export const defaultHlsAdapterRuntime = createHlsAdapterRuntime();

async function attachManagedHls(
  session: ManagedHlsSession,
  options: HlsAdapterOptions
): Promise<ManagedHlsController> {
  const { default: Hls } = await (options.loadHls ?? loadDefaultHls)();
  if (session.isActive?.() === false) {
    return { destroy: () => undefined, setQualityLevel: () => undefined };
  }
  if (!Hls.isSupported()) {
    throw new Error("hls.js is not supported in this environment.");
  }
  if (!hasClassicMediaSource() && hasManagedMediaSource()) {
    session.video.disableRemotePlayback = true;
  }
  const hls = new Hls({
    ...createInlineHlsConfig(),
    ...createHlsRequestConfig(session.video),
    ...options.hlsConfig,
  });
  let destroyed = false;
  const internalSeeks = new ManagedHlsInternalSeeks(hls, session.video);
  const binding = {
    active: () => !destroyed && session.isActive?.() !== false,
    events: Hls.Events,
    hls,
    internalSeeks,
    recovery: new ManagedHlsMediaRecovery(hls, session),
    session,
  };
  bindManagedHlsEvents(binding);
  hls.attachMedia(session.video);
  return {
    destroy: () => {
      destroyed = true;
      internalSeeks.dispose();
      hls.destroy();
    },
    isInternalSeek: (time) => !destroyed && internalSeeks.matches(time),
    setQualityLevel: (levelIndex) => {
      hls.nextLevel = levelIndex;
      syncManagedHlsLevels(binding, levelIndex);
    },
  };
}

function loadDefaultHls() {
  return import("hls.js");
}

function hasClassicMediaSource(): boolean {
  return typeof globalThis.MediaSource === "function";
}

function hasManagedMediaSource(): boolean {
  const managedMediaSource: unknown = Reflect.get(
    globalThis,
    "ManagedMediaSource"
  );
  return typeof managedMediaSource === "function";
}
