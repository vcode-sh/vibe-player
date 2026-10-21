import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../core/vibe-player-controller";
import { TestAdapter } from "../core/vibe-player-controller-test-helpers";
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
});
