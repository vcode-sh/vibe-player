import { act, cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerController } from "../core/vibe-player-controller";
import { stubPlayerIntersections } from "../react/vibe-player-visibility-test-helpers";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerHostDock } from "./vibe-player-host-dock";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function createHost(): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  return host;
}

describe("parked players and visibility", () => {
  it("does not stop a parked player as offscreen, and decides again in its next host", async () => {
    const intersections = stubPlayerIntersections();
    const inline = createHost();
    const floating = createHost();
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const controllerRef = createRef<VibePlayerController>();
    const view = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        controllerRef={controllerRef}
        host={inline}
        source={stageFileSource}
      />
    );
    await act(() => controllerRef.current?.play());
    const adapter = getStageAdapter(adapters);

    await act(async () => {
      inline.remove();
    });
    await act(async () => intersections.emit(0));
    expect(adapter.calls).not.toContain("unmount");
    expect(controllerRef.current?.getState().snapshot.readyState).toBe(
      "playing"
    );

    await act(async () => {
      view.rerender(
        <VibePlayerCompact
          adapterFactory={adapterFactory}
          controllerRef={controllerRef}
          host={floating}
          source={stageFileSource}
        />
      );
    });
    // The host the player moved to is offscreen: the usual release applies.
    await act(async () => intersections.emit(0));
    expect(adapter.calls).toContain("unmount");
  });
});

describe("host dock", () => {
  it("resumes media only when the frame moves and drops a refused resume", async () => {
    const host = createHost();
    const dock = new VibePlayerHostDock(document);
    const video = document.createElement("video");
    dock.frame.append(video);
    dock.follow(host);
    let paused = false;
    Object.defineProperty(video, "paused", { get: () => paused });
    const play = vi
      .spyOn(video, "play")
      .mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    video.dispatchEvent(new Event("play"));

    host.remove();
    paused = true;
    await act(async () => undefined);
    expect(play).toHaveBeenCalledTimes(1);

    // Unrelated page changes and later moves never retry a refused resume.
    await act(async () => {
      document.body.append(document.createElement("p"));
    });
    const next = createHost();
    await act(async () => dock.follow(next));
    expect(next.contains(dock.frame)).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    dock.dispose();
  });

  it("keeps one parking root per document and removes each when empty", async () => {
    const other = document.implementation.createHTMLDocument("Second window");
    const main = new VibePlayerHostDock(document);
    const second = new VibePlayerHostDock(other);
    const roots = (target: Document) =>
      target.querySelectorAll(".vibe-player-parking");
    expect(roots(document)).toHaveLength(1);
    expect(roots(other)).toHaveLength(1);
    expect(roots(other)[0]?.contains(second.frame)).toBe(true);

    main.dispose();
    expect(roots(document)).toHaveLength(0);
    expect(roots(other)).toHaveLength(1);
    second.dispose();
    expect(roots(other)).toHaveLength(0);
    expect(screen.queryByText("Second window")).toBeNull();
  });
});
