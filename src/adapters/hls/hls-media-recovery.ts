import type Hls from "hls.js";
import type { ErrorData } from "hls.js";
import type { ManagedHlsSession } from "./hls-runtime-types";

/** Fatal media errors this close together escalate the recovery. */
const escalationWindowMs = 3000;
/** A stream that needs more recoveries than this per minute is failing. */
const recoveryBudget = 4;
const budgetWindowMs = 60_000;

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
 * first recovers media, a second one within 3 s also swaps the audio codec,
 * and a third one within 3 s is terminal; a quiet spell starts over. More
 * than four recoveries within a minute are terminal too. Recovery detaches
 * and reattaches the media, which pauses it, so the session may resume it
 * once hls.js has attached it again.
 */
export class ManagedHlsMediaRecovery {
  private attempts: number[] = [];
  private escalation = 0;
  private readonly hls: Hls;
  private reattaching = false;
  private resume: (() => void) | null = null;
  private readonly session: ManagedHlsSession;

  constructor(hls: Hls, session: ManagedHlsSession) {
    this.hls = hls;
    this.session = session;
  }

  /** Returns whether this error is being recovered rather than reported fatal. */
  recover(data: ErrorData): boolean {
    if (!isRecoverableMediaError(data)) {
      return false;
    }
    const now = Date.now();
    const last = this.attempts.at(-1) ?? Number.NEGATIVE_INFINITY;
    const step = now - last <= escalationWindowMs ? this.escalation + 1 : 1;
    const recent = this.attempts.filter((at) => now - at < budgetWindowMs);
    if (step > 2 || recent.length >= recoveryBudget) {
      // Terminal: a pending reattach must not resume the failed media. It
      // stays a reattach, so the failed source is not loaded again.
      this.resume = null;
      return false;
    }
    this.attempts = [...recent, now];
    this.escalation = step;
    // A recovery before the last reattach keeps what the first one saw.
    if (!this.reattaching) {
      this.resume = this.session.onMediaRecovery?.() ?? null;
    }
    this.reattaching = true;
    if (step === 2) {
      this.hls.swapAudioCodec();
    }
    this.hls.recoverMediaError();
    return true;
  }

  /** Whether this attach is a recovery reattach; resumes the media if so. */
  mediaAttached(): boolean {
    if (!this.reattaching) {
      return false;
    }
    const { resume } = this;
    this.reattaching = false;
    this.resume = null;
    resume?.();
    return true;
  }
}
