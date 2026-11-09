import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

function getRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>(".vibe-player-stage");
  if (!root) {
    throw new Error("Missing player root.");
  }
  return root;
}

async function renderHiddenStage() {
  const { adapterFactory } = createStageAdapterFactory();
  const { container } = render(
    <VibePlayerStage
      adapterFactory={adapterFactory}
      autoPlay
      controlsHideDelay={100}
      source={stageFileSource}
    />
  );
  await settle();
  const root = getRoot(container);
  // A mouse move starts the idle timer that hides playing chrome.
  fireEvent.pointerMove(root, { pointerType: "mouse" });
  await settle(150);
  expect(root).toHaveAttribute("data-chrome-hidden", "true");
  return root;
}

async function renderHiddenCompact() {
  const { adapterFactory } = createStageAdapterFactory();
  const { container } = render(
    <VibePlayerCompact
      adapterFactory={adapterFactory}
      autoPlay
      controlsHideDelay={100}
      source={stageFileSource}
    />
  );
  await settle();
  const root = getRoot(container);
  fireEvent.pointerMove(root, { pointerType: "mouse" });
  await settle(150);
  expect(root).toHaveAttribute("data-controls", "hidden");
  return root;
}

describe("chrome reveal on focus", () => {
  it("reveals hidden Stage chrome when focus enters the player region", async () => {
    const root = await renderHiddenStage();
    const pause = root.querySelector('[aria-label="Pause"]');
    expect(pause?.closest("[inert]")).not.toBeNull();
    act(() => root.focus());
    expect(root).toHaveAttribute("data-chrome-hidden", "false");
    expect(pause?.closest("[inert]")).toBeNull();
  });

  it("does not reveal when the player moves focus back to its own region", async () => {
    const root = await renderHiddenStage();
    const inner = root.querySelector<HTMLElement>('[aria-label="Pause"]');
    fireEvent.focusIn(root, { relatedTarget: inner });
    expect(root).toHaveAttribute("data-chrome-hidden", "true");
  });

  it("reveals hidden compact controls when focus enters the player region", async () => {
    const root = await renderHiddenCompact();
    act(() => root.focus());
    expect(root).toHaveAttribute("data-controls", "visible");
    const pause = root.querySelector('[data-part="controls"]');
    expect(pause).not.toHaveAttribute("inert");
  });

  it("leaves a touch press to the tap policy instead of revealing on focus", async () => {
    const root = await renderHiddenCompact();
    fireEvent.pointerDown(root, { pointerType: "touch" });
    act(() => root.focus());
    expect(root).toHaveAttribute("data-controls", "hidden");
  });
});
