import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

afterEach(cleanup);

async function renderPaused(
  skin: "chips" | "glass",
  pictureInPicture: boolean,
  supported = true
) {
  const harness = createStageAdapterFactory({
    configure: (adapter) => {
      adapter.capabilities.canPictureInPicture = supported;
    },
  });
  render(
    <VibePlayerCompact
      adapterFactory={harness.adapterFactory}
      controls={{ pictureInPicture }}
      skin={skin}
      source={stageFileSource}
    />
  );
  // Chips is a lazy chunk; settle its import inside act before querying.
  await act(() => import("./vibe-player-chips-skin"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
  });
  return getStageAdapter(harness.adapters);
}

describe("compact Picture-in-Picture control", () => {
  it.each(["glass", "chips"] as const)(
    "toggles Picture-in-Picture from the %s skin when enabled",
    async (skin) => {
      const adapter = await renderPaused(skin, true);
      const toggle = screen.getByRole("button", { name: "Picture in picture" });
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      await act(async () => {
        fireEvent.click(toggle);
      });
      expect(adapter.calls).toContain("pip");
      // One name; aria-pressed carries the state (APG toggle button).
      const pressed = screen.getByRole("button", {
        name: "Picture in picture",
      });
      expect(pressed).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.queryByRole("button", { name: "Exit picture in picture" })
      ).toBeNull();
      await act(async () => {
        fireEvent.click(pressed);
      });
      expect(adapter.calls).toContain("exit-pip");
      expect(
        screen.getByRole("button", { name: "Picture in picture" })
      ).toHaveAttribute("aria-pressed", "false");
    }
  );

  it("stays absent by default and where the provider cannot do it", async () => {
    await renderPaused("glass", false);
    expect(
      screen.queryByRole("button", { name: "Picture in picture" })
    ).toBeNull();
    cleanup();
    await renderPaused("glass", true, false);
    expect(
      screen.queryByRole("button", { name: "Picture in picture" })
    ).toBeNull();
  });
});
