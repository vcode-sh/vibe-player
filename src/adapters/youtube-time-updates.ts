const youtubeTimeUpdateIntervalMs = 500;

export interface YouTubeTimeUpdatesOptions {
  onTimeUpdate: () => void;
}

export class YouTubeTimeUpdates {
  private interval: number | null = null;
  private readonly onTimeUpdate: () => void;

  constructor({ onTimeUpdate }: YouTubeTimeUpdatesOptions) {
    this.onTimeUpdate = onTimeUpdate;
  }

  start(): void {
    if (this.interval) {
      return;
    }
    this.interval = window.setInterval(
      () => this.onTimeUpdate(),
      youtubeTimeUpdateIntervalMs
    );
  }

  stop(): void {
    if (!this.interval) {
      return;
    }
    window.clearInterval(this.interval);
    this.interval = null;
  }
}
