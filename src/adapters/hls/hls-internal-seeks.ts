import type Hls from "hls.js";

/** hls.js sets the playhead exactly, so its own target is this close. */
const recordedToleranceSeconds = 0.1;
/** The live edge and start position move a little before `seeking` fires. */
const positionToleranceSeconds = 0.5;
/** Recorded jumps hls.js has not reported as `seeking` yet. */
const recordedLimit = 4;

/** hls.js raises these nonfatal errors right after it moved the playhead. */
const internalSeekDetails: ReadonlySet<string> = new Set([
  "bufferNudgeOnStall",
  "bufferSeekOverHole",
]);

export function isHlsInternalSeekError(
  details: string,
  fatal: boolean
): boolean {
  return !fatal && internalSeekDetails.has(details);
}

/**
 * Recognizes the seeks hls.js makes itself: stall nudges and buffer-hole
 * skips (reported by a nonfatal error right after the jump), live-edge
 * catch-up to `liveSyncPosition` on a live playlist, and the start-position seek before
 * playback. Rarer hls.js seeks, such as alternate-audio switches and
 * interstitials, are not recognized and remain media seeks.
 */
export class ManagedHlsInternalSeeks {
  private targets: number[] = [];
  private readonly hls: Hls;
  private readonly video: HTMLVideoElement;

  constructor(hls: Hls, video: HTMLVideoElement) {
    this.hls = hls;
    this.video = video;
  }

  /** hls.js just moved the playhead; its `seeking` arrives later. */
  record(): void {
    this.targets = [
      ...this.targets.slice(1 - recordedLimit),
      this.video.currentTime,
    ];
  }

  /** Whether the media's seek to `time` is one hls.js made. */
  matches(time: number): boolean {
    const index = this.targets.findIndex(
      (target) => Math.abs(target - time) <= recordedToleranceSeconds
    );
    if (index !== -1) {
      this.targets = this.targets.filter((_, item) => item !== index);
      return true;
    }
    // hls.js computes a sync position for VOD too; it only seeks there live.
    const live =
      this.hls.latestLevelDetails?.live === true
        ? readPosition(this.hls.liveSyncPosition)
        : null;
    if (live !== null && isNear(live, time)) {
      return true;
    }
    const start = readPosition(this.hls.startPosition);
    return (
      this.video.played.length === 0 && start !== null && isNear(start, time)
    );
  }
}

function readPosition(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function isNear(position: number, time: number): boolean {
  return Math.abs(position - time) <= positionToleranceSeconds;
}
