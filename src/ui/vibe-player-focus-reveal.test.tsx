import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderHiddenCompact,
  renderHiddenStage,
} from "./vibe-player-focus-test-helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
