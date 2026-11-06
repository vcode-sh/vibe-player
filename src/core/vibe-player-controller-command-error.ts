import { createVibePlayerError } from "./vibe-player-errors";
import type { VibePlayerEvent } from "./vibe-player-host-events";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

export interface RunVibePlayerControllerCommandInput {
  adapter: VibePlayerAdapter | null;
  command: string;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  emitEvent: (event: VibePlayerEvent) => void;
  execute: () => Promise<void> | undefined;
  getState: () => VibePlayerControllerState;
  isCurrent: () => boolean;
  updateState: (next: Partial<VibePlayerControllerState>) => void;
}

export async function runVibePlayerControllerCommand(
  input: RunVibePlayerControllerCommandInput
): Promise<void> {
  const { currentSource: source } = input.getState();
  try {
    await input.execute();
  } catch (cause) {
    if (source && input.isCurrent()) {
      reportCommandFailure(input, source, cause);
    }
    throw cause;
  }
}

function reportCommandFailure(
  input: RunVibePlayerControllerCommandInput,
  source: VibePlayerSource,
  cause: unknown
): void {
  const { adapter, command } = input;
  const error = createVibePlayerError({
    cause,
    details: { command },
    phase: "playback",
    source,
  });
  if (command !== "play" && command !== "pause") {
    input.emitEvent({ command, error, source, type: "commanderror" });
    return;
  }
  input.updateState({
    error,
    lastEvent: "error",
    snapshot: adapter?.getSnapshot() ?? input.getState().snapshot,
  });
  input.emitAnalytics({
    provider: source.type,
    sourceId: source.id,
    type: "error",
  });
}
