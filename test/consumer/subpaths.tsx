import { IconPlayerPlay } from "@tabler/icons-react";
import {
  VibePlayerCompact,
  type VibePlayerCompactProps,
  type VibePlayerIcons,
} from "vibe-player/compact";
import {
  createVibePlayerAudioFocusParticipant,
  type UseVibePlayerOptions,
  useVibePlayer,
  useVibePlayerAudioFocus,
  type VibePlayerSource,
} from "vibe-player/hook";
import { VibePlayerStage } from "vibe-player/stage";

export const renewableSource = {
  durationSeconds: 60,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  height: 1920,
  id: "renewable-portrait",
  posterUrl: "/poster.jpg",
  type: "hls",
  url: "/signed/initial/master.m3u8",
  width: 1080,
} satisfies VibePlayerSource;

export const tablerIcons = { play: IconPlayerPlay } satisfies VibePlayerIcons;
export const compactOptions = {
  icons: tablerIcons,
  load: "onPlay",
  loadHls: () => import("hls.js/light"),
  renewSource: async () => ({
    ...renewableSource,
    url: "/signed/fresh/master.m3u8",
  }),
  source: renewableSource,
} satisfies VibePlayerCompactProps;

export const compact = <VibePlayerCompact {...compactOptions} />;
export const full = <VibePlayerStage {...compactOptions} variant="full" />;

export function CustomLazyPlayer() {
  const options = {
    ...compactOptions,
    audioFocus: "media",
    pauseWhenHidden: true,
    stopWhenOffscreen: true,
  } satisfies UseVibePlayerOptions;
  const player = useVibePlayer(options);
  return (
    <section>
      <div ref={player.setTarget} />
      <button onClick={() => player.controller.play()} type="button">
        Play
      </button>
      <button onClick={() => player.controller.stop()} type="button">
        Stop
      </button>
    </section>
  );
}

export function HostAudio({ pause }: { pause: () => void }) {
  const focus = useVibePlayerAudioFocus({ group: "media", onPause: pause });
  return (
    <button onClick={() => focus.claim()} type="button">
      Claim audio focus
    </button>
  );
}

export const hostFocus = createVibePlayerAudioFocusParticipant("media", () => {
  // Hosts pause their voice-note engine here.
});
