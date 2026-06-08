export const cinematicDefaultMotion = {
  chromeHideDelayMs: 2400,
  durationFastMs: 180,
  durationMediumMs: 220,
  durationSlowMs: 260,
  easeEmphasized: "cubic-bezier(.23,1,.32,1)",
  easeExit: "cubic-bezier(.215,.61,.355,1)",
} as const;

export const cinematicDefaultSkinClassNames = {
  modal: "vibe-player-modal",
  panel: "vibe-player-modal__panel",
  shell: "vibe-player-shell",
} as const;
