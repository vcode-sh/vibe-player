import { act, fireEvent, render } from "@testing-library/react";
import { expect, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

/** Advances fake timers and flushes the promises they release. */
export const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

export const focusTestHideDelayMs = 100;

export function getPlayerRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>(".vibe-player-stage");
  if (!root) {
    throw new Error("Missing player root.");
  }
  return root;
}

/** A playing Stage whose chrome the idle timer has hidden (fake timers). */
export async function renderHiddenStage() {
  const { adapterFactory } = createStageAdapterFactory();
  const { container } = render(
    <VibePlayerStage
      adapterFactory={adapterFactory}
      autoPlay
      controlsHideDelay={focusTestHideDelayMs}
      source={stageFileSource}
    />
  );
  await settle();
  const root = getPlayerRoot(container);
  // A mouse move starts the idle timer that hides playing chrome.
  fireEvent.pointerMove(root, { pointerType: "mouse" });
  await settle(focusTestHideDelayMs + 50);
  expect(root).toHaveAttribute("data-chrome-hidden", "true");
  return root;
}

/** A playing glass compact player whose controls have hidden (fake timers). */
export async function renderHiddenCompact() {
  const { adapterFactory } = createStageAdapterFactory();
  const { container } = render(
    <VibePlayerCompact
      adapterFactory={adapterFactory}
      autoPlay
      controlsHideDelay={focusTestHideDelayMs}
      source={stageFileSource}
    />
  );
  await settle();
  const root = getPlayerRoot(container);
  fireEvent.pointerMove(root, { pointerType: "mouse" });
  await settle(focusTestHideDelayMs + 50);
  expect(root).toHaveAttribute("data-controls", "hidden");
  return root;
}
