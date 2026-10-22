export interface CinematicDefaultCaptionTokens {
  bottomMobileRem: number;
  bottomWideRem: number;
  chipBackground: string;
  chipRadiusPx: number;
  chipShadow: string;
  fontSizeMobilePx: number;
  fontSizeWidePx: number;
  maxWidth: string;
}

export interface CinematicDefaultChromeTokens {
  buttonSizeRem: number;
  hiddenOffsetRem: number;
  idleDelayMs: number;
  scrimBackground: string;
  scrimDurationMs: number;
  scrimHeightRem: number;
  transitionDurationMs: number;
}

export interface CinematicDefaultModalTokens {
  backdropBlurPx: number;
  backdropOpacity: number;
  backdropScaleClosed: number;
  backdropScaleOpen: number;
  background: string;
  gradient: string;
  panelPadding: string;
  shellWidth: string;
  wash: string;
}

export interface CinematicDefaultMotionTokens {
  actionHoverMs: number;
  easeEmphasized: string;
  easeExit: string;
  mediaHoverMs: number;
  overlayInMs: number;
  overlayOutMs: number;
  reducedMotionQuery: string;
  surfaceHoverMs: number;
  textHoverMs: number;
}

export interface CinematicDefaultShellTokens {
  background: string;
  border: string;
  radiusPx: number;
  shadow: string;
}

export interface CinematicDefaultTimelineTokens {
  focusDurationMs: number;
  ghostSizeRem: number;
  hitAreaRem: number;
  pointSizeRem: number;
  railHeightPx: number;
  tooltipClampMaxPct: number;
  tooltipClampMinPct: number;
}

export interface CinematicDefaultSkinTokens {
  caption: CinematicDefaultCaptionTokens;
  chrome: CinematicDefaultChromeTokens;
  modal: CinematicDefaultModalTokens;
  motion: CinematicDefaultMotionTokens;
  shell: CinematicDefaultShellTokens;
  timeline: CinematicDefaultTimelineTokens;
}

/** Reference design values; CSS and hook options control rendered players. */
export const cinematicDefaultSkinTokens: CinematicDefaultSkinTokens = {
  caption: {
    bottomMobileRem: 5.75,
    bottomWideRem: 6.5,
    chipBackground: "rgba(0, 0, 0, 0.58)",
    chipRadiusPx: 3,
    chipShadow: "0 10px 24px rgba(0, 0, 0, 0.26)",
    fontSizeMobilePx: 14,
    fontSizeWidePx: 15,
    maxWidth: "min(82%, 48rem)",
  },
  chrome: {
    buttonSizeRem: 1.75,
    hiddenOffsetRem: 0.5,
    idleDelayMs: 2400,
    scrimBackground:
      "linear-gradient(to top, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.16), transparent)",
    scrimDurationMs: 220,
    scrimHeightRem: 8,
    transitionDurationMs: 240,
  },
  modal: {
    backdropBlurPx: 18,
    backdropOpacity: 0.7,
    backdropScaleClosed: 1.04,
    backdropScaleOpen: 1.06,
    background: "#050506",
    gradient:
      "linear-gradient(to top, rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.42))",
    panelPadding: "clamp(4.5rem, 8svh, 6.5rem) clamp(1rem, 4vw, 4rem)",
    shellWidth: "min(92vw, calc((100svh - 9rem) * 1.777), 1760px)",
    wash: "rgba(0, 0, 0, 0.34)",
  },
  motion: {
    actionHoverMs: 200,
    easeEmphasized: "cubic-bezier(.23,1,.32,1)",
    easeExit: "cubic-bezier(.215,.61,.355,1)",
    mediaHoverMs: 220,
    overlayInMs: 180,
    overlayOutMs: 180,
    reducedMotionQuery: "(prefers-reduced-motion: reduce)",
    surfaceHoverMs: 200,
    textHoverMs: 200,
  },
  shell: {
    background: "rgba(0, 0, 0, 0.45)",
    border: "rgba(133, 140, 255, 0.45)",
    radiusPx: 8,
    shadow:
      "0 28px 120px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(255, 255, 255, 0.06)",
  },
  timeline: {
    focusDurationMs: 150,
    ghostSizeRem: 0.5,
    hitAreaRem: 2,
    pointSizeRem: 0.375,
    railHeightPx: 2,
    tooltipClampMaxPct: 94,
    tooltipClampMinPct: 6,
  },
};
