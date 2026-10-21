import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../core/vibe-player-controller";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayerController } from "./use-vibe-player-controller";

describe("useVibePlayerController", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps its subscription while renders and controller state change", async () => {
    const subscribe = vi.spyOn(VibePlayerController.prototype, "subscribe");
    const options = { adapterFactory: () => new TestAdapter() };
    const { result, rerender, unmount } = renderHook(() =>
      useVibePlayerController(options)
    );

    rerender();
    await act(() =>
      result.current.controller.mount(document.createElement("div"))
    );

    expect(result.current.state.isMounted).toBe(true);
    expect(subscribe).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("hydrates the idle state without an uncached server snapshot warning", async () => {
    const options = { adapterFactory: () => new TestAdapter() };
    function PlayerState() {
      const { state } = useVibePlayerController(options);
      return <output>{state.snapshot.readyState}</output>;
    }
    const container = document.createElement("div");
    container.innerHTML = renderToString(<PlayerState />);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const root = hydrateRoot(container, <PlayerState />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toBe("idle");
    expect(consoleError).not.toHaveBeenCalled();
    await act(() => root.unmount());
  });

  it("switches subscriptions to the replacement controller and releases both adapters", async () => {
    const firstAdapter = new TestAdapter();
    const secondAdapter = new TestAdapter();
    const { result, rerender, unmount } = renderHook(
      (options) => useVibePlayerController(options),
      { initialProps: { adapterFactory: () => firstAdapter } }
    );
    const firstController = result.current.controller;
    await act(() => firstController.load(fileSource));
    act(() => firstAdapter.emit("timeupdate", { currentTime: 12 }));
    expect(result.current.state.snapshot.currentTime).toBe(12);

    rerender({ adapterFactory: () => secondAdapter });
    await act(() => result.current.controller.load(fileSource));
    act(() => secondAdapter.emit("timeupdate", { currentTime: 34 }));
    act(() => firstAdapter.emit("timeupdate", { currentTime: 99 }));
    expect(result.current.state.snapshot.currentTime).toBe(34);
    expect(
      firstAdapter.calls.filter((call) => call === "unmount")
    ).toHaveLength(1);

    unmount();
    expect(
      secondAdapter.calls.filter((call) => call === "unmount")
    ).toHaveLength(1);
  });
});
