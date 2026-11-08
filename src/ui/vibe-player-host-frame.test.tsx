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

function createHosts() {
  const inline = document.createElement("div");
  const floating = document.createElement("div");
  document.body.append(inline, floating);
  return { floating, inline };
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe("detached compact host", () => {
  it("moves one playing session between hosts without remounting media", async () => {
    const { floating, inline } = createHosts();
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const view = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        host={inline}
        source={stageFileSource}
      />
    );
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    });
    const adapter = getStageAdapter(adapters);
    const player = screen.getByRole("region", {
      name: "Stage demo video player",
    });
    const video = player.querySelector("video");
    expect(inline.contains(video)).toBe(true);

    await act(async () => {
      view.rerender(
        <VibePlayerCompact
          adapterFactory={adapterFactory}
          host={floating}
          source={stageFileSource}
        />
      );
    });
    expect(floating.contains(player)).toBe(true);
    expect(inline.childElementCount).toBe(0);
    expect(player.querySelector("video")).toBe(video);
    expect(adapters).toHaveLength(1);
    expect(adapter.calls.filter((call) => call === "mount")).toHaveLength(1);
    expect(adapter.calls).not.toContain("unmount");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("stays in its last host while none is given and leaves with the player", async () => {
    const { inline } = createHosts();
    const { adapterFactory } = createStageAdapterFactory();
    const view = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        host={inline}
        source={stageFileSource}
      />
    );
    await act(async () => {
      view.rerender(
        <VibePlayerCompact
          adapterFactory={adapterFactory}
          host={null}
          source={stageFileSource}
        />
      );
    });
    expect(inline.querySelector(".vibe-player-compact")).not.toBeNull();

    view.unmount();
    expect(inline.childElementCount).toBe(0);
  });
});
