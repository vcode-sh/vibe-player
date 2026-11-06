import { vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { TestAdapter } from "./vibe-player-controller-test-helpers";
import type {
  VibePlayerAdapterEvent,
  VibePlayerControllerOptions,
  VibePlayerSource,
} from "./vibe-player-types";

export class RenewalAdapter extends TestAdapter {
  private emitEvent: (event: VibePlayerAdapterEvent) => void = () => undefined;

  override subscribe(listener: (event: VibePlayerAdapterEvent) => void) {
    this.emitEvent = listener;
    return super.subscribe(listener);
  }

  fail(fatal = true, status = 403): void {
    this.emitEvent({
      payload: {
        fatal,
        message: "Delivery denied",
        status,
        type: "networkError",
      },
      snapshot: { ...this.getSnapshot(), readyState: "error" },
      type: "error",
    });
  }

  failNativeHls(): void {
    this.emitEvent({
      payload: { code: 4, fatal: true, nativeHls: true, network: false },
      snapshot: { ...this.getSnapshot(), readyState: "error" },
      type: "error",
    });
  }
}

export function deferredSource() {
  let resolve: (source: VibePlayerSource) => void = () => undefined;
  let reject: (cause: Error) => void = () => undefined;
  const promise = new Promise<VibePlayerSource>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, reject, resolve };
}

export function renewalHarness(
  options: Partial<VibePlayerControllerOptions> = {}
) {
  const adapters: RenewalAdapter[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => {
      const adapter = new RenewalAdapter();
      adapters.push(adapter);
      return adapter;
    },
    ...options,
  });
  const adapter = (index: number) => {
    const result = adapters[index];
    if (!result) {
      throw new Error(`Missing adapter ${index}`);
    }
    return result;
  };
  const settled = async (count: number) => {
    await vi.waitFor(() => expectReady(controller, adapters.length, count));
  };
  return { adapter, adapters, controller, settled };
}

function expectReady(
  controller: VibePlayerController,
  count: number,
  expected: number
): void {
  if (
    count !== expected ||
    controller.getState().snapshot.readyState === "loading"
  ) {
    throw new Error("Renewal has not settled");
  }
}
