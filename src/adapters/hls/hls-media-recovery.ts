import type Hls from "hls.js";
import type { ErrorData } from "hls.js";

/** Fatal media errors this close together escalate the recovery. */
const recoveryWindowMs = 3000;

/** No compatible codec is a source problem that recovery cannot fix. */
function isRecoverableMediaError({ details, fatal, type }: ErrorData): boolean {
  return (
    fatal &&
    type === "mediaError" &&
    details !== "manifestIncompatibleCodecsError"
  );
}

/**
 * The hls.js recovery ladder for fatal media (decode or buffer) errors: the
 * first recovers media, a second one soon after also swaps the audio codec,
 * and a third one soon after is terminal. A quiet window starts over.
 * Returns whether this error is being recovered rather than reported fatal.
 */
export function createHlsMediaRecovery(hls: Hls) {
  let attempts = 0;
  let lastAttemptAt = Number.NEGATIVE_INFINITY;
  return (data: ErrorData): boolean => {
    if (!isRecoverableMediaError(data)) {
      return false;
    }
    const now = Date.now();
    const escalating = now - lastAttemptAt <= recoveryWindowMs;
    const attempt = escalating ? attempts + 1 : 1;
    if (attempt > 2) {
      return false;
    }
    attempts = attempt;
    lastAttemptAt = now;
    if (attempt === 2) {
      hls.swapAudioCodec();
    }
    hls.recoverMediaError();
    return true;
  };
}
