import { describe, expect, it, vi } from "vitest";
import { createVibePlayerAudioFocusParticipant } from "./vibe-player-audio-focus";

describe("audible playback groups", () => {
  it("pauses the previous participant and ignores its late release", () => {
    const pauseVoice = vi.fn();
    const pauseVideo = vi.fn();
    const voice = createVibePlayerAudioFocusParticipant(
      "conversation",
      pauseVoice
    );
    const video = createVibePlayerAudioFocusParticipant(
      "conversation",
      pauseVideo
    );
    const next = createVibePlayerAudioFocusParticipant("conversation", vi.fn());
    try {
      voice.claim();
      voice.claim();
      expect(pauseVoice).not.toHaveBeenCalled();
      video.claim();
      expect(pauseVoice).toHaveBeenCalledTimes(1);
      voice.release();
      next.claim();
      expect(pauseVideo).toHaveBeenCalledTimes(1);
    } finally {
      voice.dispose();
      video.dispose();
      next.dispose();
    }
  });

  it("isolates groups and never reclaims from a disposed participant", () => {
    const pauseVoice = vi.fn();
    const voice = createVibePlayerAudioFocusParticipant(
      "voice-only",
      pauseVoice
    );
    const video = createVibePlayerAudioFocusParticipant("video-only", vi.fn());
    try {
      voice.claim();
      video.claim();
      expect(pauseVoice).not.toHaveBeenCalled();
      voice.dispose();
      voice.claim();
      const next = createVibePlayerAudioFocusParticipant("voice-only", vi.fn());
      next.claim();
      expect(pauseVoice).not.toHaveBeenCalled();
      next.dispose();
    } finally {
      voice.dispose();
      video.dispose();
    }
  });
});
