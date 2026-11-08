import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";
import { stubPlayerIntersections } from "./vibe-player-visibility-test-helpers";

async function renderPlayingPlayer() {
  const intersections = stubPlayerIntersections();
  const adapter = new TestAdapter();
  const adapterFactory = () => adapter;
  const rendered = renderHook(() =>
    useVibePlayer({ adapterFactory, source: fileSource })
  );
  act(() => rendered.result.current.setTarget(document.createElement("div")));
  await waitFor(() =>
    expect(rendered.result.current.state.snapshot.readyState).toBe("ready")
  );
  act(() => {
    intersections.emit(0.9);
    adapter.emit("play", {
      currentTime: 12,
      paused: false,
      readyState: "playing",
    });
  });
  return { adapter, intersections, ...rendered };
}

describe("player visibility in Picture-in-Picture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps Picture-in-Picture playing offscreen and releases once it closes there", async () => {
    const { adapter, intersections, result, unmount } =
      await renderPlayingPlayer();
    act(() =>
      adapter.emit("pictureinpicturechange", { isPictureInPicture: true })
    );

    await act(async () => intersections.emit(0));
    expect(result.current.state.snapshot.paused).toBe(false);
    expect(adapter.calls).not.toContain("unmount");

    await act(async () =>
      adapter.emit("pictureinpicturechange", { isPictureInPicture: false })
    );
    await waitFor(() =>
      expect(result.current.state.snapshot.readyState).toBe("idle")
    );
    expect(result.current.state.snapshot.currentTime).toBe(12);
    expect(adapter.calls).toContain("unmount");
    unmount();
  });

  it("keeps playback after Picture-in-Picture closes back in view", async () => {
    const { adapter, intersections, result, unmount } =
      await renderPlayingPlayer();
    act(() =>
      adapter.emit("pictureinpicturechange", { isPictureInPicture: true })
    );
    act(() => intersections.emit(0));
    act(() => intersections.emit(0.9));

    await act(async () =>
      adapter.emit("pictureinpicturechange", { isPictureInPicture: false })
    );
    expect(result.current.state.snapshot.paused).toBe(false);
    expect(adapter.calls).not.toContain("unmount");
    unmount();
  });

  it("keeps Picture-in-Picture playing in a hidden tab", async () => {
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility
    );
    const { adapter, result, unmount } = await renderPlayingPlayer();
    act(() =>
      adapter.emit("pictureinpicturechange", { isPictureInPicture: true })
    );
    visibility = "hidden";
    await act(async () =>
      document.dispatchEvent(new Event("visibilitychange"))
    );
    expect(result.current.state.snapshot.paused).toBe(false);
    expect(adapter.calls).not.toContain("unmount");
    unmount();
  });
});
