import { formatVibePlayerTime } from "../core/vibe-player-time";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

export const defaultVibePlayerLabels: Required<VibePlayerLabels> = {
  adaptiveQuality: "Adaptive",
  autoQuality: "Auto",
  bitrate: (megabits) => `${megabits} Mbps`,
  buffering: "Buffering video",
  captionsShortcut: "C",
  captionsUnavailable: "Captions unavailable",
  close: "Close",
  exitFullscreen: "Exit full screen",
  exitPictureInPicture: "Exit picture in picture",
  fixedQuality: "Fixed",
  fullscreen: "Full screen",
  fullscreenShortcut: "F",
  hideCaptions: "Hide captions",
  loading: "Loading video",
  manualQuality: "Manual",
  mostReplayed: "Most replayed",
  mute: "Mute",
  muteShortcut: "M",
  pause: "Pause",
  paused: "Paused",
  pictureInPicture: "Picture in picture",
  play: "Play",
  playbackSpeed: "Playback speed",
  playbackSpeedValue: (rate) => `Playback speed ${rate}`,
  playing: "Playing",
  playShortcut: "Space / K",
  playToStart: "Play to start",
  quality: "Quality",
  qualityValue: (quality) => `Quality ${quality}`,
  replay: "Replay",
  replayValue: () => "",
  retry: "Retry",
  retryCaptions: "Retry captions",
  seek: "Seek",
  seekBackward: (seconds) => `Back ${seconds} seconds`,
  seekForward: (seconds) => `Forward ${seconds} seconds`,
  seekOffset: (seconds) => `${seconds} seconds`,
  seekShortcut: "← / →",
  seekValue: (time, duration) => `${time} of ${duration}`,
  showCaptions: "Show captions",
  unavailable: "Playback unavailable",
  unmute: "Unmute",
  videoPlayer: "Video player",
  videoPlayerTitle: (title) => `${title} video player`,
  volume: "Volume",
  volumeTrigger: (action, percent) => `${action}, volume ${percent}%`,
  volumeValue: (percent, muted) => {
    if (muted) {
      return `Muted, volume ${percent}%`;
    }
    return `Volume ${percent}%`;
  },
};

export const defaultVibePlayerTimeFormatter = formatVibePlayerTime;
