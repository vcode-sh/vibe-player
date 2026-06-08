export function isVibePlayerPlaybackBlockedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "NotAllowedError";
}
