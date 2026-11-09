import type { VibePlayerAdapterEvent } from "../../core/vibe-player-types";
import type { ManagedHlsController } from "./hls-runtime-types";

/** A `seeking` this close to a seek the adapter made is that seek. */
const ownToleranceSeconds = 0.5;
/** Own seeks not echoed yet. */
const ownLimit = 4;

type SeekPayload = VibePlayerAdapterEvent["payload"];

/**
 * Marks `seeking` and the `seeked` that ends it `internal` when hls.js made
 * the seek itself, and never a seek the adapter made for the controller.
 */
export class HlsAdapterSeekMarks {
  private internal = false;
  private own: number[] = [];

  /** The adapter is about to seek to `seconds`. */
  expectOwn(seconds: number): void {
    this.own = [...this.own.slice(1 - ownLimit), seconds];
  }

  reset(): void {
    this.internal = false;
    this.own = [];
  }

  payload(
    type: string,
    time: number,
    controller: ManagedHlsController | null
  ): SeekPayload {
    if (type === "seeking") {
      this.internal =
        !this.consumeOwn(time) && controller?.isInternalSeek?.(time) === true;
      return this.internal ? { internal: true } : undefined;
    }
    if (type === "seeked" && this.internal) {
      this.internal = false;
      return { internal: true };
    }
    return undefined;
  }

  private consumeOwn(time: number): boolean {
    const index = this.own.findIndex(
      (target) => Math.abs(target - time) <= ownToleranceSeconds
    );
    if (index === -1) {
      return false;
    }
    this.own = this.own.filter((_, item) => item !== index);
    return true;
  }
}
