import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getStageAdapter,
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

function getLiveRegions(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[aria-live]")];
}

function getAnnouncer(container: HTMLElement): HTMLElement {
  const region = container.querySelector<HTMLElement>(
    '[data-part="announcer"]'
  );
  if (!region) {
    throw new Error("Missing player announcer.");
  }
  return region;
}

function getRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>(".vibe-player-stage");
  if (!root) {
    throw new Error("Missing player root.");
  }
  return root;
}

/** Every distinct announcement, in order, as assistive technology hears it. */
function recordAnnouncements(region: HTMLElement): string[] {
  const heard: string[] = [];
  const observer = new MutationObserver(() => {
    const text = region.textContent?.trim() ?? "";
    if (text) {
      heard.push(text);
    }
  });
  observer.observe(region, {
    characterData: true,
    childList: true,
    subtree: true,
  });
  return heard;
}

function countText(container: HTMLElement, text: string): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let count = 0;
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.trim() === text) {
      count += 1;
    }
  }
  const labelled = container.querySelectorAll(`[aria-label="${text}"]`);
  return count + labelled.length;
}

describe("player announcements", () => {
  it("mounts one empty polite region in the compact player before a status exists", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    await settle();
    const regions = getLiveRegions(container);
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute("aria-live", "polite");
    expect(regions[0]).toHaveTextContent("");
  });

  it("announces a compact failure once and then leaves one visible message", async () => {
    const { adapterFactory } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.loadError = new Error("Provider failed");
      },
    });
    const { container, getByRole } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    const heard = recordAnnouncements(getAnnouncer(container));
    fireEvent.click(getByRole("button", { name: "Play" }));
    await settle(400);
    expect(heard).toEqual(["Playback unavailable"]);
    await settle(10_000);
    expect(getAnnouncer(container)).toHaveTextContent("");
    expect(countText(container, "Playback unavailable")).toBe(1);
    expect(heard).toEqual(["Playback unavailable"]);
  });

  it("announces Stage buffering only after the spinner delay, with real status text", async () => {
    const harness = createStageAdapterFactory();
    const { container } = render(
      <VibePlayerStage
        adapterFactory={harness.adapterFactory}
        autoPlay
        source={stageFileSource}
      />
    );
    await settle();
    const announcer = getAnnouncer(container);
    act(() => {
      getStageAdapter(harness.adapters).emitEvent("buffering", {
        paused: false,
        readyState: "buffering",
      });
    });
    await settle(319);
    expect(announcer).toHaveTextContent("");
    await settle(1);
    expect(announcer).toHaveTextContent("Buffering video");
    const status = container.querySelector(".vibe-player-stage__status--busy");
    expect(status).toHaveTextContent("Buffering video");
    expect(status).not.toHaveAttribute("aria-live");
    expect(getLiveRegions(container)).toEqual([announcer]);
  });

  it("announces the settled result of keyboard play and debounced seeks", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const { container } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    await settle();
    const root = getRoot(container);
    const heard = recordAnnouncements(getAnnouncer(container));
    root.focus();
    fireEvent.keyDown(root, { code: "KeyK", key: "k" });
    await settle(499);
    expect(heard).toEqual([]);
    await settle(1);
    expect(heard).toEqual(["Playing"]);

    fireEvent.keyDown(root, { code: "ArrowRight", key: "ArrowRight" });
    await settle(200);
    fireEvent.keyDown(root, { code: "ArrowRight", key: "ArrowRight" });
    await settle(499);
    expect(heard).toEqual(["Playing"]);
    await settle(1);
    expect(heard).toEqual(["Playing", "0:20 of 1:40"]);

    fireEvent.keyDown(root, { code: "KeyK", key: "k" });
    await settle(500);
    expect(heard).toEqual(["Playing", "0:20 of 1:40", "Paused"]);
  });

  it("repeats an identical keyboard result instead of staying silent", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const { container } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    await settle();
    const root = getRoot(container);
    const heard = recordAnnouncements(getAnnouncer(container));
    root.focus();
    fireEvent.keyDown(root, { code: "KeyK", key: "k" });
    await settle(600);
    // Pause and play again within the quiet time: the result is unchanged.
    fireEvent.keyDown(root, { code: "KeyK", key: "k" });
    await settle(100);
    fireEvent.keyDown(root, { code: "KeyK", key: "k" });
    await settle(600);
    expect(heard).toEqual(["Playing", "Playing"]);
  });
});
