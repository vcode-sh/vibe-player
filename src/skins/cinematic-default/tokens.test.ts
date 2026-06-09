import { describe, expect, it } from "vitest";
import {
  cinematicDefaultMotion,
  cinematicDefaultSkin,
  cinematicDefaultSkinClassNames,
  cinematicDefaultSkinTokens,
} from ".";

describe("cinematic default skin tokens", () => {
  it("freezes overlay motion and chrome timing", () => {
    expect(cinematicDefaultSkinTokens.motion.easeEmphasized).toBe(
      "cubic-bezier(.23,1,.32,1)"
    );
    expect(cinematicDefaultSkinTokens.motion.easeExit).toBe(
      "cubic-bezier(.215,.61,.355,1)"
    );
    expect(cinematicDefaultSkinTokens.motion.overlayInMs).toBe(180);
    expect(cinematicDefaultSkinTokens.motion.overlayOutMs).toBe(180);
    expect(cinematicDefaultSkinTokens.chrome.idleDelayMs).toBe(2400);
    expect(cinematicDefaultSkinTokens.chrome.transitionDurationMs).toBe(240);
  });

  it("keeps the cinematic shell and backdrop recipe explicit", () => {
    expect(cinematicDefaultSkinTokens.shell.radiusPx).toBe(8);
    expect(cinematicDefaultSkinTokens.shell.border).toBe(
      "rgba(133, 140, 255, 0.45)"
    );
    expect(cinematicDefaultSkinTokens.modal.backdropBlurPx).toBe(18);
    expect(cinematicDefaultSkinTokens.modal.backdropScaleOpen).toBe(1.06);
    expect(cinematicDefaultSkinTokens.modal.shellWidth).toBe(
      "min(92vw, calc((100svh - 9rem) * 1.777), 1760px)"
    );
  });

  it("keeps timeline and caption geometry aligned", () => {
    expect(cinematicDefaultSkinTokens.caption.bottomMobileRem).toBe(5.75);
    expect(cinematicDefaultSkinTokens.caption.maxWidth).toBe("min(82%, 48rem)");
    expect(cinematicDefaultSkinTokens.timeline.hitAreaRem).toBe(2);
    expect(cinematicDefaultSkinTokens.timeline.tooltipClampMinPct).toBe(6);
    expect(cinematicDefaultSkinTokens.timeline.tooltipClampMaxPct).toBe(94);
  });

  it("preserves the legacy compact motion export", () => {
    expect(cinematicDefaultMotion.chromeHideDelayMs).toBe(2400);
    expect(cinematicDefaultMotion.durationFastMs).toBe(180);
    expect(cinematicDefaultMotion.durationMediumMs).toBe(220);
    expect(cinematicDefaultMotion.easeEmphasized).toBe(
      cinematicDefaultSkinTokens.motion.easeEmphasized
    );
  });

  it("exports the first skin as a neutral cinematic preset", () => {
    expect(cinematicDefaultSkin.metadata).toEqual({
      colorScheme: "dark",
      id: "cinematic-default",
      intent: "neutral-cinematic",
      label: "Cinematic default",
    });
    expect(cinematicDefaultSkin.classNames.root).toBe(
      "vibe-player-skin--cinematic-default"
    );
    expect(cinematicDefaultSkin.classNames.modalPanel).toBe(
      cinematicDefaultSkinClassNames.modalPanel
    );
    expect(cinematicDefaultSkinClassNames.panel).toBe(
      cinematicDefaultSkinClassNames.modalPanel
    );
    expect(cinematicDefaultSkin.tokens).toBe(cinematicDefaultSkinTokens);
  });
});
