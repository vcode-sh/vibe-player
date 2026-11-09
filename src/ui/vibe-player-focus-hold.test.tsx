import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  focusTestHideDelayMs,
  renderHiddenCompact,
  renderHiddenStage,
  settle,
} from "./vibe-player-focus-test-helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** The visible Pause control: the Stage bar button or the compact capsule. */
function getPause(root: HTMLElement): HTMLElement {
  const control = root.querySelector<HTMLElement>(
    '[data-part="toggle"], .vibe-player-controls__button[aria-label="Pause"]'
  );
  if (!control) {
    throw new Error("Missing Pause control.");
  }
  return control;
}

/**
 * Browsers match `:focus-visible` only after keyboard input; focus moved by a
 * screen reader or script often does not. happy-dom matches it always.
 */
function withoutFocusVisible() {
  const { matches } = Element.prototype;
  vi.spyOn(Element.prototype, "matches").mockImplementation(function (
    this: Element,
    selector: string
  ) {
    return selector === ":focus-visible" ? false : matches.call(this, selector);
  });
}

/** Window blur and return: the focused element loses and regains focus. */
function leaveAndReturnToWindow(element: HTMLElement) {
  const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(false);
  fireEvent.focusOut(element, { relatedTarget: null });
  hasFocus.mockReturnValue(true);
  fireEvent.focusIn(element, { relatedTarget: null });
}

describe("chrome held by navigation focus", () => {
  it.each([
    ["Stage", renderHiddenStage, "data-chrome-hidden", "false"],
    ["compact", renderHiddenCompact, "data-controls", "visible"],
  ] as const)(
    "keeps %s chrome open while assistive technology rests on a control",
    async (_name, renderHidden, attribute, visible) => {
      withoutFocusVisible();
      const root = await renderHidden();
      act(() => root.focus());
      const pause = getPause(root);
      // Programmatic focus without a pointer press, as a screen reader moves it.
      act(() => pause.focus());
      await settle(focusTestHideDelayMs * 30);
      expect(root).toHaveAttribute(attribute, visible);
      expect(document.activeElement).toBe(pause);
    }
  );

  it("does not reveal hidden chrome when the window regains focus", async () => {
    const root = await renderHiddenStage();
    act(() => root.focus());
    await settle(focusTestHideDelayMs + 50);
    expect(root).toHaveAttribute("data-chrome-hidden", "true");

    leaveAndReturnToWindow(root);
    expect(root).toHaveAttribute("data-chrome-hidden", "true");

    // Focus that really enters the player still reveals it.
    const outside = document.createElement("button");
    document.body.append(outside);
    act(() => outside.focus());
    act(() => root.focus());
    expect(root).toHaveAttribute("data-chrome-hidden", "false");
    outside.remove();
  });
});
