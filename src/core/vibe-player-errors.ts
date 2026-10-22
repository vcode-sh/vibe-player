import type {
  VibePlayerAdapterEvent,
  VibePlayerError,
  VibePlayerSource,
} from "./vibe-player-types";

interface CreateVibePlayerErrorInput {
  cause?: unknown;
  details?: VibePlayerAdapterEvent["payload"];
  phase: VibePlayerError["phase"];
  source: VibePlayerSource;
}

export function createVibePlayerError({
  cause,
  details,
  phase,
  source,
}: CreateVibePlayerErrorInput): VibePlayerError {
  let message = "Playback failed.";
  if (cause instanceof Error) {
    ({ message } = cause);
  } else if (typeof details?.message === "string") {
    ({ message } = details);
  }
  return {
    ...(cause === undefined ? {} : { cause }),
    ...(details ? { details: { ...details } } : {}),
    message,
    phase,
    provider: source.type,
    sourceId: source.id,
  };
}

export function isVibePlayerPlaybackBlockedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "NotAllowedError";
}
