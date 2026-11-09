import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

afterEach(cleanup);

/**
 * A two-state toggle keeps one name and changes only its pressed state
 * (WAI-ARIA APG button pattern), so speech never contradicts the state.
 */
async function expectFullscreenToggle(adapterCalls: () => string[]) {
  const toggle = await screen.findByRole("button", { name: "Full screen" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  await act(async () => {
    fireEvent.click(toggle);
  });
  expect(adapterCalls()).toContain("fullscreen");
  const pressed = screen.getByRole("button", { name: "Full screen" });
  expect(pressed).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Exit full screen" })).toBeNull();
  await act(async () => {
    fireEvent.click(pressed);
  });
  expect(adapterCalls()).toContain("exit-fullscreen");
  expect(screen.getByRole("button", { name: "Full screen" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
}

async function renderPausedCompact(
  skin: "chips" | "glass",
  onExpand?: () => void
) {
  const harness = createStageAdapterFactory();
  render(
    <VibePlayerCompact
      adapterFactory={harness.adapterFactory}
      onExpand={onExpand}
      skin={skin}
      source={stageFileSource}
    />
  );
  await act(() => import("./vibe-player-chips-skin"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
  });
  return harness;
}

describe("fullscreen toggle state", () => {
  it.each(["glass", "chips"] as const)(
    "keeps one name and exposes the pressed state in the %s skin",
    async (skin) => {
      const harness = await renderPausedCompact(skin);
      await expectFullscreenToggle(
        () => getStageAdapter(harness.adapters).calls
      );
    }
  );

  it("keeps one name and exposes the pressed state in the full stage", async () => {
    const harness = createStageAdapterFactory();
    render(
      <VibePlayerStage
        adapterFactory={harness.adapterFactory}
        source={stageFileSource}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
    });
    await expectFullscreenToggle(() => getStageAdapter(harness.adapters).calls);
  });

  it.each(["glass", "chips"] as const)(
    "gives the %s expand button no pressed state when onExpand opens a host view",
    async (skin) => {
      const onExpand = vi.fn();
      await renderPausedCompact(skin, onExpand);
      const expand = screen.getByRole("button", { name: "Full screen" });
      expect(expand).not.toHaveAttribute("aria-pressed");
      fireEvent.click(expand);
      expect(onExpand).toHaveBeenCalledOnce();
    }
  );
});
