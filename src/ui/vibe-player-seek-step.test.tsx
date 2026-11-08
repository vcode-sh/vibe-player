import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";
import type { VibePlayerCompactControls } from "./vibe-player-surface-types";

afterEach(cleanup);

const skipBack = /^Back /;

interface PausedOptions {
  canSeek?: boolean;
  controls?: VibePlayerCompactControls;
  seekStep?: number;
}

/** A paused player 40 s into a 100 s file. */
async function renderPaused(
  skin: "chips" | "full" | "glass",
  { canSeek = true, controls, seekStep }: PausedOptions = {}
) {
  const harness = createStageAdapterFactory({
    configure: (created) => {
      created.capabilities.canSeek = canSeek;
    },
  });
  const shared = {
    adapterFactory: harness.adapterFactory,
    controls,
    seekStep,
    source: stageFileSource,
  };
  const view = render(
    skin === "full" ? (
      <VibePlayerStage {...shared} autoHideControls={false} />
    ) : (
      <VibePlayerCompact {...shared} skin={skin} />
    )
  );
  await act(() => import("./vibe-player-chips-skin"));
  await act(async () => {
    const [play] = screen.getAllByRole("button", { name: "Play" });
    if (play) {
      fireEvent.click(play);
    }
  });
  const adapter = getStageAdapter(harness.adapters);
  await act(async () => {
    adapter.emitEvent("timeupdate", { currentTime: 40 });
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
  });
  const root = view.container.querySelector(".vibe-player-stage");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Missing player root");
  }
  return { adapter, root };
}

const lastSeek = (calls: readonly string[]) =>
  calls.filter((call) => call.startsWith("seek:")).at(-1);

describe("seek step", () => {
  it.each(["glass", "chips", "full"] as const)(
    "labels and moves %s skip buttons by the configured step",
    async (skin) => {
      const { adapter } = await renderPaused(skin, {
        controls: { skip: true },
        seekStep: 15,
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Back 15 seconds" })
        );
      });
      expect(lastSeek(adapter.calls)).toBe("seek:25");
      await act(async () => {
        adapter.emitEvent("timeupdate", { currentTime: 25 });
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Forward 15 seconds" })
        );
      });
      expect(lastSeek(adapter.calls)).toBe("seek:40");
    }
  );

  it("shows skips by default only in the full stage, and never without seeking", async () => {
    await renderPaused("glass");
    expect(screen.queryByRole("button", { name: skipBack })).toBeNull();
    cleanup();
    await renderPaused("full");
    expect(
      screen.getByRole("button", { name: "Back 10 seconds" })
    ).toBeTruthy();
    cleanup();
    await renderPaused("full", { controls: { skip: false } });
    expect(screen.queryByRole("button", { name: skipBack })).toBeNull();
    cleanup();
    await renderPaused("glass", { canSeek: false, controls: { skip: true } });
    expect(screen.queryByRole("button", { name: skipBack })).toBeNull();
  });

  it.each([
    ["glass", "ArrowRight", "seek:70"],
    ["glass", "j", "seek:10"],
    ["full", "l", "seek:70"],
    ["full", "ArrowLeft", "seek:10"],
  ] as const)(
    "moves the %s player by the step for %s",
    async (skin, key, expected) => {
      const { adapter, root } = await renderPaused(skin, { seekStep: 30 });
      await act(async () => {
        fireEvent.keyDown(root, { key });
      });
      expect(lastSeek(adapter.calls)).toBe(expected);
    }
  );
});
