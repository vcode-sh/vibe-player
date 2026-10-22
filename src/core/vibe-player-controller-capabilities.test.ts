import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

// Shared UI lays out controls from capabilities; a provider that accepts a
// source but takes seconds to become ready must not keep stale layout meanwhile.
describe("controller capabilities during source loading", () => {
  it("publishes source-derived capabilities while provider readiness is pending", async () => {
    const adapter = new TestAdapter();
    let finishLoad: () => void = () => undefined;
    const load = vi.spyOn(adapter, "load").mockImplementation(() => {
      // Providers compute capabilities from the source, as fresh objects.
      Object.defineProperty(adapter, "capabilities", {
        value: { ...adapter.capabilities, controlsPresentation: "outside" },
      });
      return new Promise<void>((resolve) => {
        finishLoad = resolve;
      });
    });
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
    });

    const loading = controller.load(fileSource);
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());

    expect(controller.getState().capabilities?.controlsPresentation).toBe(
      "outside"
    );
    expect(controller.getState().lastEvent).toBeNull();
    finishLoad();
    await loading;
    expect(controller.getState().lastEvent).toBe("ready");
  });
});
