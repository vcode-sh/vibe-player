const youtubePlaybackBlockedTimeoutMs = 2500;
const youtubePlaybackStartedEpsilonSeconds = 0.05;

export interface YouTubePlaybackWatchdogOptions {
  emitPlayBlocked: () => void;
  hasPlayer: () => boolean;
}

export class YouTubePlaybackWatchdog {
  private readonly emitPlayBlocked: () => void;
  private readonly hasPlayer: () => boolean;
  private generation = 0;
  private intent = false;
  private startTime = 0;
  private timer: number | null = null;

  constructor({ emitPlayBlocked, hasPlayer }: YouTubePlaybackWatchdogOptions) {
    this.emitPlayBlocked = emitPlayBlocked;
    this.hasPlayer = hasPlayer;
  }

  begin(currentTime: number): void {
    this.intent = true;
    this.startTime = currentTime;
    this.schedule();
  }

  cancelIntent(): void {
    this.intent = false;
    this.cancelTimer();
  }

  cancelIfIdle(): void {
    if (!this.intent) {
      this.cancelTimer();
    }
  }

  completeIfAdvanced(currentTime: number): void {
    if (
      this.intent &&
      currentTime > this.startTime + youtubePlaybackStartedEpsilonSeconds
    ) {
      this.cancelIntent();
    }
  }

  ensureScheduled(): void {
    if (this.intent && !this.timer) {
      this.schedule();
    }
  }

  private schedule(): void {
    this.cancelTimer();
    const generation = this.generation + 1;
    this.generation = generation;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (this.generation !== generation || !this.hasPlayer()) {
        return;
      }
      this.intent = false;
      this.emitPlayBlocked();
    }, youtubePlaybackBlockedTimeoutMs);
  }

  private cancelTimer(): void {
    this.generation += 1;
    if (!this.timer) {
      return;
    }
    window.clearTimeout(this.timer);
    this.timer = null;
  }
}
