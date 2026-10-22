import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren, StrictMode } from "react";
import { describe, expect, it } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";

function createAdapters() {
  const adapters: TestAdapter[] = [];
  const adapterFactory = () => {
    const adapter = new TestAdapter();
    adapters.push(adapter);
    return adapter;
  };
  const getAdapter = (index: number) => {
    const adapter = adapters[index];
    if (!adapter) {
      throw new Error(`Missing adapter ${index}`);
    }
    return adapter;
  };
  return { adapterFactory, adapters, getAdapter };
}

function StrictWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>;
}

describe("useVibePlayer source lifecycle", () => {
  it("preserves playback for equal fresh sources and reloads a changed URL with the same ID", async () => {
    const { adapterFactory, adapters, getAdapter } = createAdapters();
    const { result, rerender, unmount } = renderHook(
      ({ source }) => useVibePlayer({ adapterFactory, source }),
      { initialProps: { source: fileSource } }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
    act(() =>
      getAdapter(0).emit("play", {
        currentTime: 37,
        paused: false,
        readyState: "playing",
      })
    );

    rerender({
      source: {
        ...fileSource,
        sources: fileSource.sources.map((media) => ({ ...media })),
      },
    });
    expect(adapters).toHaveLength(1);
    expect(result.current.state.snapshot).toMatchObject({
      currentTime: 37,
      paused: false,
    });
    expect(getAdapter(0).calls).not.toContain("unmount");

    rerender({
      source: {
        ...fileSource,
        sources: [{ mimeType: "video/mp4", url: "/replacement.mp4" }],
      },
    });
    await waitFor(() => expect(adapters).toHaveLength(2));
    await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
    expect(result.current.state.currentSource).toMatchObject({
      sources: [{ url: "/replacement.mp4" }],
    });
    expect(getAdapter(0).calls).toContain("unmount");
    unmount();
  });

  it("starts the existing source when autoplay is enabled without loading it again", async () => {
    const { adapterFactory, adapters, getAdapter } = createAdapters();
    const { result, rerender, unmount } = renderHook(
      ({ autoPlay }) =>
        useVibePlayer({ adapterFactory, autoPlay, source: fileSource }),
      { initialProps: { autoPlay: false } }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
    expect(getAdapter(0).calls).not.toContain("play");

    rerender({ autoPlay: true });
    await waitFor(() => expect(getAdapter(0).calls).toContain("play"));
    expect(adapters).toHaveLength(1);
    expect(
      getAdapter(0).calls.filter((call) => call.startsWith("load:"))
    ).toEqual(["load:video-1"]);
    expect(getAdapter(0).calls.slice(-2)).toEqual(["muted:true", "play"]);
    unmount();
  });

  it("does not autoplay a source whose pending load completes after closing", async () => {
    const adapter = new TestAdapter();
    let finishLoad: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      finishLoad = resolve;
    });
    adapter.load = () => pending;
    const adapterFactory = () => adapter;
    const { result, rerender, unmount } = renderHook(
      ({ open }) =>
        useVibePlayer({
          adapterFactory,
          autoPlay: true,
          open,
          source: fileSource,
        }),
      { initialProps: { open: true } }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.currentSource?.id).toBe("video-1")
    );
    rerender({ open: false });
    await act(async () => {
      finishLoad();
      await pending;
    });

    expect(adapter.calls).not.toContain("play");
    expect(result.current.state.currentSource).toBeNull();
    expect(adapter.calls).toContain("unmount");
    unmount();
  });

  it("waits for a reopened source to finish loading before autoplay", async () => {
    const first = new TestAdapter();
    const second = new TestAdapter();
    let finishLoad: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      finishLoad = resolve;
    });
    second.load = () => pending;
    let created = 0;
    const adapterFactory = () => {
      created += 1;
      return created === 1 ? first : second;
    };
    const { result, rerender, unmount } = renderHook(
      ({ open }) =>
        useVibePlayer({
          adapterFactory,
          autoPlay: true,
          open,
          source: fileSource,
        }),
      { initialProps: { open: true } }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() => expect(first.calls).toContain("play"));
    rerender({ open: false });
    await waitFor(() => expect(result.current.state.currentSource).toBeNull());
    rerender({ open: true });
    await waitFor(() => expect(created).toBe(2));
    const callsBeforeReady = [...second.calls];
    await act(async () => {
      finishLoad();
      await pending;
    });
    await waitFor(() => expect(second.calls).toContain("play"));

    expect(callsBeforeReady).not.toContain("play");
    expect(second.calls.filter((call) => call === "play")).toHaveLength(1);
    unmount();
  });

  it("closes the source even after its media target was detached", async () => {
    const { adapterFactory } = createAdapters();
    const { result, rerender, unmount } = renderHook(
      ({ open }) => useVibePlayer({ adapterFactory, open, source: fileSource }),
      { initialProps: { open: true } }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
    act(() => result.current.setTarget(null));
    await waitFor(() => expect(result.current.state.isMounted).toBe(false));
    rerender({ open: false });
    await waitFor(() => expect(result.current.state.currentSource).toBeNull());
    expect(result.current.state.isMounted).toBe(false);
    unmount();
  });

  it("loads a target under StrictMode and disposes it on unmount", async () => {
    const { adapterFactory, getAdapter } = createAdapters();
    const { result, unmount } = renderHook(
      () => useVibePlayer({ adapterFactory, source: fileSource }),
      { wrapper: StrictWrapper }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.currentSource?.id).toBe("video-1")
    );
    await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
    unmount();
    expect(getAdapter(0).calls).toContain("unmount");
  });
});
