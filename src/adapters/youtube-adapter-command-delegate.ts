import {
  enterYouTubeFullscreen,
  exitYouTubeFullscreen,
  pauseYouTubeVideo,
  playYouTubeVideo,
  seekYouTubeVideo,
  setYouTubeMuted,
  setYouTubePlaybackRate,
  setYouTubeVolume,
  type YouTubeAdapterCommandInput,
} from "./youtube-adapter-commands";

export abstract class YouTubeAdapterCommandDelegate {
  protected abstract readonly commandInput: YouTubeAdapterCommandInput;

  pause(): Promise<void> {
    return pauseYouTubeVideo(this.commandInput);
  }

  play(): Promise<void> {
    return playYouTubeVideo(this.commandInput);
  }

  seekTo(seconds: number): Promise<void> {
    return seekYouTubeVideo(this.commandInput, seconds);
  }

  setMuted(value: boolean): Promise<void> {
    return setYouTubeMuted(this.commandInput, value);
  }

  setPlaybackRate(value: number): Promise<void> {
    return setYouTubePlaybackRate(this.commandInput, value);
  }

  setVolume(value: number): Promise<void> {
    return setYouTubeVolume(this.commandInput, value);
  }

  async enterFullscreen(): Promise<void> {
    await enterYouTubeFullscreen(this.commandInput);
  }

  async exitFullscreen(): Promise<void> {
    await exitYouTubeFullscreen(this.commandInput);
  }
}
