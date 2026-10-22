import { createVibePlayerError } from "./vibe-player-errors";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
} from "./vibe-player-types";

export interface RunVibePlayerControllerCommandInput {
  adapter: VibePlayerAdapter | null;
  command: string;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  execute: () => Promise<void> | undefined;
  getState: () => VibePlayerControllerState;
  isCurrent: () => boolean;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export async function runVibePlayerControllerCommand({
  adapter,
  command,
  emitAnalytics,
  execute,
  getState,
  isCurrent,
  updateState,
}: RunVibePlayerControllerCommandInput): Promise<void> {
  const { currentSource: source } = getState();
  try {
    await execute();
  } catch (cause) {
    if (source && isCurrent()) {
      updateState({
        error: createVibePlayerError({
          cause,
          details: { command },
          phase: "playback",
          source,
        }),
        lastEvent: "error",
        ...(command === "play" || command === "pause"
          ? { snapshot: adapter?.getSnapshot() ?? getState().snapshot }
          : {}),
      });
      emitAnalytics({
        provider: source.type,
        sourceId: source.id,
        type: "error",
      });
    }
    throw cause;
  }
}
