import type {
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "../core/vibe-player-types";
import {
  enterNativeVideoFullscreen,
  enterNativeVideoPictureInPicture,
  exitNativeVideoFullscreen,
  type NativeVideoCommandInput,
  pauseNativeVideo,
  playNativeVideo,
  seekNativeVideo,
  setNativeVideoMuted,
  setNativeVideoPlaybackRate,
  setNativeVideoVolume,
} from "./native-video-playback";

export interface HlsAdapterNativeCommandInput {
  canSeek: () => boolean;
  emit: (type: VibePlayerEventName) => void;
  getPlaybackGeneration: () => number;
  getSnapshot: () => VibePlayerSnapshot;
  getVideo: () => HTMLVideoElement | null;
  incrementPlaybackGeneration: () => number;
  isMounted: () => boolean;
}

export interface HlsAdapterNativeCommands {
  enterFullscreen: () => Promise<void>;
  enterPictureInPicture: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  setMuted: (value: boolean) => Promise<void>;
  setPlaybackRate: (value: number) => Promise<void>;
  setVolume: (value: number) => Promise<void>;
}

export abstract class HlsAdapterNativeCommandDelegate {
  protected abstract readonly nativeCommands: HlsAdapterNativeCommands;

  pause(): Promise<void> {
    return this.nativeCommands.pause();
  }

  async play(): Promise<void> {
    await this.nativeCommands.play();
  }

  seekTo(seconds: number): Promise<void> {
    return this.nativeCommands.seekTo(seconds);
  }

  setMuted(value: boolean): Promise<void> {
    return this.nativeCommands.setMuted(value);
  }

  setPlaybackRate(value: number): Promise<void> {
    return this.nativeCommands.setPlaybackRate(value);
  }

  setVolume(value: number): Promise<void> {
    return this.nativeCommands.setVolume(value);
  }

  async enterFullscreen(): Promise<void> {
    await this.nativeCommands.enterFullscreen();
  }

  async enterPictureInPicture(): Promise<void> {
    await this.nativeCommands.enterPictureInPicture();
  }

  async exitFullscreen(): Promise<void> {
    await this.nativeCommands.exitFullscreen();
  }
}

export function createHlsAdapterNativeCommands(
  input: HlsAdapterNativeCommandInput
): HlsAdapterNativeCommands {
  const commandInput = createNativeCommandInput(input);
  return {
    enterFullscreen: () => enterNativeVideoFullscreen(commandInput),
    enterPictureInPicture: () => enterNativeVideoPictureInPicture(commandInput),
    exitFullscreen: () => exitNativeVideoFullscreen(commandInput),
    pause: () => pauseNativeVideo(commandInput),
    play: () => playNativeVideo(commandInput),
    seekTo: (seconds) => seekNativeVideo(commandInput, seconds),
    setMuted: (value) => setNativeVideoMuted(commandInput, value),
    setPlaybackRate: (value) => setNativeVideoPlaybackRate(commandInput, value),
    setVolume: (value) => setNativeVideoVolume(commandInput, value),
  };
}

function createNativeCommandInput(
  input: HlsAdapterNativeCommandInput
): NativeVideoCommandInput {
  return {
    canSeek: input.canSeek,
    emit: input.emit,
    getPlaybackGeneration: input.getPlaybackGeneration,
    getSnapshot: input.getSnapshot,
    getVideo: input.getVideo,
    incrementPlaybackGeneration: input.incrementPlaybackGeneration,
    isMounted: input.isMounted,
  };
}
