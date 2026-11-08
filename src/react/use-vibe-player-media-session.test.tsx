import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import {
  installFakeMediaSession,
  uninstallFakeMediaSession,
} from "../core/vibe-player-media-session-test-helpers";
import type { VibePlayerSource } from "../core/vibe-player-types";
import { type UseVibePlayerOptions, useVibePlayer } from "./use-vibe-player";
import type { UseVibePlayerMediaSessionOptions } from "./use-vibe-player-media-session";

const audible = {
  muted: false,
  paused: false,
  readyState: "playing",
  volume: 1,
} as const;

function source(title: string): VibePlayerSource {
  return { ...fileSource, id: title, title };
}

async function renderPlayer(
  mediaSession: UseVibePlayerOptions["mediaSession"],
  title = "Aurora",
  seekStep?: number
) {
  const adapter = new TestAdapter();
  const factory = () => adapter;
  const view = renderHook(
    ({ session }: { session: UseVibePlayerOptions["mediaSession"] }) =>
      useVibePlayer({
        adapterFactory: factory,
        audioFocus: false,
        mediaSession: session,
        seekStep,
        source: source(title),
      }),
    { initialProps: { session: mediaSession } }
  );
  act(() => view.result.current.setTarget(document.createElement("div")));
  await waitFor(() =>
    expect(view.result.current.state.currentSource?.title).toBe(title)
  );
  return { adapter, view };
}

afterEach(uninstallFakeMediaSession);

describe("useVibePlayer mediaSession", () => {
  it("leaves the page session alone unless the app opts in", async () => {
    const page = installFakeMediaSession();
    const { adapter, view } = await renderPlayer(undefined);
    act(() => adapter.emit("play", audible));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(page.metadata).toBeNull();
    expect(page.actions).toEqual([]);
    view.unmount();
  });

  it("claims when audible, keeps it while paused and releases on stop", async () => {
    const page = installFakeMediaSession();
    const { adapter, view } = await renderPlayer(true);
    expect(page.metadata).toBeNull();

    act(() => adapter.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("Aurora"));
    act(() => adapter.emit("pause", { paused: true, readyState: "ready" }));
    expect(page.playbackState).toBe("paused");
    expect(page.actions).toContain("play");

    await act(() => view.result.current.controller.stop());
    expect(page.metadata).toBeNull();
    expect(page.actions).toEqual([]);
    view.unmount();
  });

  it("lets the latest audible player own the session and releases it on unmount", async () => {
    const page = installFakeMediaSession();
    const first = await renderPlayer(true, "First");
    const second = await renderPlayer(true, "Second");
    act(() => first.adapter.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("First"));
    act(() => second.adapter.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("Second"));

    first.view.unmount();
    expect(page.metadata?.title).toBe("Second");
    second.view.unmount();
    expect(page.metadata).toBeNull();
  });

  it("follows the host's choice of owner", async () => {
    const page = installFakeMediaSession();
    const options = (active: boolean): UseVibePlayerMediaSessionOptions => ({
      active,
      metadata: { artist: "Host" },
    });
    const { adapter, view } = await renderPlayer(options(false));
    act(() => adapter.emit("play", audible));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(page.metadata).toBeNull();

    view.rerender({ session: options(true) });
    await waitFor(() => expect(page.metadata?.artist).toBe("Host"));
    view.rerender({ session: options(false) });
    expect(page.metadata).toBeNull();
    view.unmount();
  });

  it("seeks by the player's seekStep unless an offset is given", async () => {
    const page = installFakeMediaSession();
    const step = await renderPlayer(true, "Step", 30);
    act(() => step.adapter.emit("play", { ...audible, currentTime: 50 }));
    await waitFor(() => expect(page.actions).toContain("seekbackward"));
    page.trigger("seekbackward");
    await waitFor(() => expect(step.adapter.calls).toContain("seek:20"));
    page.trigger("seekforward", { seekOffset: 5 });
    await waitFor(() => expect(step.adapter.calls).toContain("seek:25"));
    step.view.unmount();

    const own = await renderPlayer({ seekForwardSeconds: 15 }, "Own", 30);
    act(() => own.adapter.emit("play", { ...audible, currentTime: 50 }));
    await waitFor(() => expect(page.actions).toContain("seekforward"));
    page.trigger("seekforward");
    await waitFor(() => expect(own.adapter.calls).toContain("seek:65"));
    own.view.unmount();
  });
});
