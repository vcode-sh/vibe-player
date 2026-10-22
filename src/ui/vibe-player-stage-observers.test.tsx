import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibePlayerControllerState } from "../core";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

describe("stage observer isolation", () => {
  it.each(["state", "captions"] as const)(
    "keeps playback usable when the %s observer throws",
    async (boundary) => {
      const { adapterFactory, adapters } = createStageAdapterFactory();
      const cause = new Error("Host observer failed");
      const observer = () => {
        throw cause;
      };
      const onError = vi.fn();
      render(
        <VibePlayerStage
          adapterFactory={adapterFactory}
          onCaptionStatusChange={boundary === "captions" ? observer : undefined}
          onError={onError}
          onStateChange={boundary === "state" ? observer : undefined}
          source={stageFileSource}
        />
      );

      await waitFor(() =>
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            cause,
            phase: "integration",
            sourceId: "stage-video",
          })
        )
      );
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
      );
      expect(adapters).toHaveLength(1);
    }
  );

  it("contains async observer and error-reporter rejection without a reporting loop", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const cause = new Error("Async caption observer failed");
    const onError = vi.fn(async () => {
      throw new Error("Reporter failed");
    });
    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onCaptionStatusChange={async () => {
          throw cause;
        }}
        onError={onError}
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause,
          details: { operation: "caption-status-observer" },
          phase: "integration",
        })
      )
    );
    const reports = onError.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    expect(onError).toHaveBeenCalledTimes(reports);
  });

  it("ignores a late observer rejection from a replaced source", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    let reject: (cause: Error) => void = () => undefined;
    const pending = new Promise<void>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const onError = vi.fn();
    const observer = vi.fn().mockReturnValueOnce(pending);
    const { rerender } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onCaptionStatusChange={observer}
        onError={onError}
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play" })).toBeVisible()
    );
    rerender(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onCaptionStatusChange={observer}
        onError={onError}
        source={{ ...stageFileSource, id: "replacement" }}
      />
    );
    await act(async () => {
      reject(new Error("Old observer failed"));
    });
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
  });

  it("ignores an old controller observer after infrastructure replacement on the same source", async () => {
    const first = createStageAdapterFactory();
    const second = createStageAdapterFactory();
    let reject: (cause: Error) => void = () => undefined;
    const pending = new Promise<void>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const onError = vi.fn();
    const observer = vi.fn((state: VibePlayerControllerState) =>
      state.currentSource ? pending : undefined
    );
    const { rerender } = render(
      <VibePlayerStage
        adapterFactory={first.adapterFactory}
        onError={onError}
        onStateChange={observer}
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(observer).toHaveBeenCalledWith(
        expect.objectContaining({ currentSource: stageFileSource })
      )
    );
    rerender(
      <VibePlayerStage
        adapterFactory={second.adapterFactory}
        onError={onError}
        source={stageFileSource}
      />
    );
    await waitFor(() => expect(second.adapters).toHaveLength(1));
    await act(async () => {
      reject(new Error("Old controller observer failed"));
    });
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
  });

  it("ignores an initial pending observer after unmount", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    let reject: (cause: Error) => void = () => undefined;
    const pending = new Promise<void>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const onError = vi.fn();
    const { unmount } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        onCaptionStatusChange={() => pending}
        onError={onError}
        source={stageFileSource}
      />
    );
    unmount();
    await act(async () => {
      reject(new Error("Disposed observer failed"));
    });
    expect(onError).not.toHaveBeenCalled();
  });
});
