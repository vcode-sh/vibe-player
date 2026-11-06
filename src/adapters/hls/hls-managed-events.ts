import type Hls from "hls.js";
import type { Level } from "hls.js";
import { getNativeVideoStartPosition } from "../native/native-video-seek";
import { recordHlsBandwidth } from "./hls-engine-config";
import { createManagedHlsErrorHandler } from "./hls-managed-errors";
import type { ManagedHlsLevel } from "./hls-quality";
import type { ManagedHlsSession } from "./hls-runtime-types";

interface ManagedHlsEventBinding {
  active: () => boolean;
  events: typeof Hls.Events;
  hls: Hls;
  session: ManagedHlsSession;
}

export function bindManagedHlsEvents(input: ManagedHlsEventBinding): void {
  const { active, events, hls, session } = input;
  hls.on(events.MANIFEST_PARSED, () => {
    if (active()) {
      syncManagedHlsLevels(input, hls.manualLevel);
      session.onReady();
    }
  });
  hls.on(events.LEVELS_UPDATED, () =>
    syncManagedHlsLevels(input, hls.manualLevel)
  );
  hls.on(events.LEVEL_SWITCHED, () =>
    syncManagedHlsLevels(input, hls.manualLevel)
  );
  hls.on(events.LEVEL_LOADED, (_event, data) => {
    if (active()) {
      session.onLevelLoaded(data.details.live);
    }
  });
  hls.on(events.FRAG_LOADED, () => {
    if (active()) {
      recordHlsBandwidth(hls.bandwidthEstimate);
    }
  });
  bindManagedHlsLoading(input);
}

function bindManagedHlsLoading({
  active,
  events,
  hls,
  session,
}: ManagedHlsEventBinding): void {
  hls.on(events.ERROR, createManagedHlsErrorHandler({ active, hls, session }));
  hls.on(events.MEDIA_ATTACHED, () => {
    if (active()) {
      hls.loadSource(session.manifestUrl);
      hls.startLoad(getNativeVideoStartPosition(session.video) || -1);
    }
  });
}

export function syncManagedHlsLevels(
  { active, hls, session }: ManagedHlsEventBinding,
  selectedLevelIndex: number
): void {
  if (active()) {
    session.onLevelsChanged(hls.levels.map(toManagedLevel), selectedLevelIndex);
  }
}

function toManagedLevel(level: Level): ManagedHlsLevel {
  return {
    bitrate: level.bitrate,
    height: level.height,
    ...(level.name ? { name: level.name } : {}),
    ...(level.width ? { width: level.width } : {}),
  };
}
