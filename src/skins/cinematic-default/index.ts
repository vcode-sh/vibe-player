import { cinematicDefaultSkinTokens } from "./tokens";

export * from "./tokens";

export const cinematicDefaultMotion = {
  chromeHideDelayMs: cinematicDefaultSkinTokens.chrome.idleDelayMs,
  durationFastMs: cinematicDefaultSkinTokens.motion.overlayOutMs,
  durationMediumMs: cinematicDefaultSkinTokens.chrome.scrimDurationMs,
  durationSlowMs: 260,
  easeEmphasized: cinematicDefaultSkinTokens.motion.easeEmphasized,
  easeExit: cinematicDefaultSkinTokens.motion.easeExit,
} as const;

export const cinematicDefaultSkinClassNames = {
  modal: "vibe-player-modal",
  panel: "vibe-player-modal__panel",
  shell: "vibe-player-shell",
} as const;
