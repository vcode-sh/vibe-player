import { createHlsAdapter, VibePlayerController } from "vibe-player";

type PayloadValue = number | string | boolean | null | undefined;

export interface HlsRecoveryEvent {
  code?: PayloadValue;
  /** hls.js error details; absent on the media element's own errors. */
  details?: PayloadValue;
  fatal?: PayloadValue;
  type: string;
}

export interface HlsRecoveryProbe {
  errors: { kind: string; phase: string }[];
  /** Host-visible errors and pauses, in order. */
  events: HlsRecoveryEvent[];
}

const mode = new URLSearchParams(window.location.search).get("glitch");
const run = Math.random().toString(36).slice(2);
const probe: HlsRecoveryProbe = { errors: [], events: [] };
const controller = new VibePlayerController({
  // Chromium has MediaSource, so this is managed hls.js playback.
  adapterFactory: () => createHlsAdapter(),
  onError: (error) =>
    probe.errors.push({ kind: error.kind, phase: error.phase }),
  onEvent: (event) => {
    if (event.type === "error" || event.type === "pause") {
      const payload = "payload" in event ? event.payload : undefined;
      probe.events.push({
        code: payload?.code,
        details: payload?.details,
        fatal: payload?.fatal,
        type: event.type,
      });
    }
  },
});
const target = document.getElementById("player");
if (!target) {
  throw new Error("Missing HLS recovery fixture target.");
}
await controller.mount(target);
await controller.setMuted(true);
await controller.load({
  id: "glitch",
  type: "hls",
  url: `/glitch/${mode}/${run}/stream.m3u8`,
});

Object.assign(window, { hlsRecovery: { controller, probe } });
