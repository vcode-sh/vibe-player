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

afterEach(cleanup);

async function expectFullscreenToggle(adapterCalls: () => string[]) {
  const enter = await screen.findByRole("button", {
    name: "Full screen",
  });
  expect(enter).toHaveAttribute("aria-pressed", "false");
  await act(async () => {
    fireEvent.click(enter);
  });
  expect(adapterCalls()).toContain("fullscreen");
  const exit = screen.getByRole("button", { name: "Exit full screen" });
  expect(exit).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Full screen" })).toBeNull();
  await act(async () => {
    fireEvent.click(exit);
  });
  expect(adapterCalls()).toContain("exit-fullscreen");
  expect(screen.getByRole("button", { name: "Full screen" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
}

describe("fullscreen toggle state", () => {
  it.each(["glass", "chips"] as const)(
    "exposes the pressed state and exit label in the %s skin",
    async (skin) => {
      const harness = createStageAdapterFactory();
      render(
        <VibePlayerCompact
          adapterFactory={harness.adapterFactory}
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
      await expectFullscreenToggle(
        () => getStageAdapter(harness.adapters).calls
      );
    }
  );

  it("exposes the pressed state and exit label in the full stage", async () => {
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
});
