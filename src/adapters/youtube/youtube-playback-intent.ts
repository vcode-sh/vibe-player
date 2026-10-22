export interface YouTubePlaybackIntentOptions {
  emitPlayBlocked: () => void;
  hasPlayer: () => boolean;
}

/** Tracks requested playback; only the SDK can confirm browser-policy blocking. */
export class YouTubePlaybackIntent {
  private readonly emitPlayBlocked: () => void;
  private readonly hasPlayer: () => boolean;
  private pending = false;
  private startTime = 0;

  constructor({ emitPlayBlocked, hasPlayer }: YouTubePlaybackIntentOptions) {
    this.emitPlayBlocked = emitPlayBlocked;
    this.hasPlayer = hasPlayer;
  }

  begin(currentTime: number): void {
    this.pending = true;
    this.startTime = currentTime;
  }

  cancel(): void {
    this.pending = false;
  }

  completeIfAdvanced(currentTime: number): void {
    if (currentTime > this.startTime + 0.05) {
      this.cancel();
    }
  }

  reportBlocked(): void {
    if (!(this.pending && this.hasPlayer())) {
      return;
    }
    this.pending = false;
    this.emitPlayBlocked();
  }
}
