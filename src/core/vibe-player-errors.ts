import type {
  VibePlayerAdapterEvent,
  VibePlayerError,
  VibePlayerErrorKind,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

const errorKinds: readonly unknown[] = ["network", "decode", "source"];

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
    kind: getErrorKind(cause, details),
    message,
    phase,
    provider: source.type,
    sourceId: source.id,
  };
}

/**
 * Adapters report a kind in their payload. A rejected play() reports only a
 * name, and `NotSupportedError` there means the media cannot be played. Other
 * commands (Picture-in-Picture, fullscreen) reject with it for unrelated reasons.
 */
function getErrorKind(
  cause: unknown,
  details: VibePlayerAdapterEvent["payload"]
): VibePlayerErrorKind {
  const kind = details?.kind;
  if (isErrorKind(kind)) {
    return kind;
  }
  const command = details?.command;
  const isPlayback = command === undefined || command === "play";
  return isPlayback &&
    cause instanceof Error &&
    cause.name === "NotSupportedError"
    ? "source"
    : "unknown";
}

function isErrorKind(value: unknown): value is VibePlayerErrorKind {
  return errorKinds.includes(value);
}

/**
 * The media's own events explain a play() it rejected because it paused
 * itself (native controls, PiP, OS) or failed (its error event reports that).
 */
export function isVibePlayerMediaInterruption(
  error: unknown,
  { paused, readyState }: VibePlayerSnapshot
): boolean {
  return (
    readyState === "error" ||
    (paused && error instanceof Error && error.name === "AbortError")
  );
}

export function isVibePlayerPlaybackBlockedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "NotAllowedError";
}
