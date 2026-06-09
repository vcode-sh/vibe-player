import type { VibePlayerSkinPreset } from "../vibe-player-skin-types";
import { cinematicDefaultSkinTokens } from "./tokens";

export * from "./tokens";

/** Legacy compact motion export kept for early consumers. */
export const cinematicDefaultMotion = {
  chromeHideDelayMs: cinematicDefaultSkinTokens.chrome.idleDelayMs,
  durationFastMs: cinematicDefaultSkinTokens.motion.overlayOutMs,
  durationMediumMs: cinematicDefaultSkinTokens.chrome.scrimDurationMs,
  durationSlowMs: 260,
  easeEmphasized: cinematicDefaultSkinTokens.motion.easeEmphasized,
  easeExit: cinematicDefaultSkinTokens.motion.easeExit,
} as const;

/** Stable CSS hooks for the neutral cinematic default skin. */
export const cinematicDefaultSkinClassNames = {
  ambientPreview: "vibe-player-ambient-preview",
  captionOverlay: "vibe-player-caption-overlay",
  modal: "vibe-player-modal",
  modalPanel: "vibe-player-modal__panel",
  panel: "vibe-player-modal__panel",
  root: "vibe-player-skin--cinematic-default",
  shell: "vibe-player-shell",
} as const;

/** First exported skin preset: neutral package chrome with Discovery-grade motion. */
export const cinematicDefaultSkin: VibePlayerSkinPreset<
  typeof cinematicDefaultSkinTokens
> = {
  classNames: {
    ...cinematicDefaultSkinClassNames,
    stage: "vibe-player-stage",
  },
  metadata: {
    colorScheme: "dark",
    id: "cinematic-default",
    intent: "neutral-cinematic",
    label: "Cinematic default",
  },
  tokens: cinematicDefaultSkinTokens,
};
