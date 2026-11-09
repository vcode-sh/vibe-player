import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerHostFrame } from "./vibe-player-host-frame";
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

  it("parks the player while its host is gone and attaches it to the next host", async () => {
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
    const player = screen.getByRole("region", {
      name: "Stage demo video player",
    });
    const video = player.querySelector("video");

    await act(async () => {
      inline.remove();
    });
    const parking = document.querySelector(".vibe-player-parking");
    expect(parking?.contains(player)).toBe(true);
    expect(parking).toHaveAttribute("inert");
    expect(player.isConnected).toBe(true);

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
    expect(player.querySelector("video")).toBe(video);
    expect(getStageAdapter(adapters).calls).not.toContain("unmount");
    expect(document.querySelector(".vibe-player-parking")).toBeNull();
  });

  it("waits parked for a host that is not on the page yet", async () => {
    const pending = document.createElement("div");
    render(
      <VibePlayerHostFrame host={pending}>
        <p>Movable</p>
      </VibePlayerHostFrame>
    );
    const content = screen.getByText("Movable");
    expect(
      document.querySelector(".vibe-player-parking")?.contains(content)
    ).toBe(true);

    await act(async () => {
      document.body.append(pending);
    });
    expect(pending.contains(content)).toBe(true);
    cleanup();
    expect(pending.childElementCount).toBe(0);
    expect(document.querySelector(".vibe-player-parking")).toBeNull();
  });

  it("resumes media the browser paused while detached, not media the viewer paused", async () => {
    const { inline } = createHosts();
    render(
      <VibePlayerHostFrame host={inline}>
        <video data-testid="interrupted" muted />
        <video data-testid="viewer-paused" muted />
      </VibePlayerHostFrame>
    );
    const interrupted = screen.getByTestId("interrupted") as HTMLVideoElement;
    const viewerPaused = screen.getByTestId(
      "viewer-paused"
    ) as HTMLVideoElement;
    const plays = [interrupted, viewerPaused].map((media) => {
      let paused = false;
      Object.defineProperty(media, "paused", { get: () => paused });
      media.dispatchEvent(new Event("play"));
      return {
        pause: () => {
          paused = true;
        },
        play: vi.spyOn(media, "play").mockImplementation(() => {
          paused = false;
          return Promise.resolve();
        }),
      };
    });
    const [first, second] = plays;
    second?.pause();
    viewerPaused.dispatchEvent(new Event("pause"));

    await act(async () => {
      inline.remove();
      // The engine pauses media that stays out of the page.
      first?.pause();
      second?.pause();
    });
    expect(first?.play).toHaveBeenCalledTimes(1);
    expect(second?.play).not.toHaveBeenCalled();
    expect(interrupted.paused).toBe(false);
  });
});
