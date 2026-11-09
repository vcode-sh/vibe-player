import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createControllerWithAdapter,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import { connectVibePlayerMediaSession } from "./vibe-player-media-session-connect";
import {
  installFakeMediaSession,
  uninstallFakeMediaSession,
} from "./vibe-player-media-session-test-helpers";
import type { VibePlayerMediaSessionArtwork } from "./vibe-player-media-session-types";
import { renewalHarness } from "./vibe-player-renewal-test-helpers";
import type { VibePlayerSource } from "./vibe-player-types";

const signed = (token: string): VibePlayerSource => ({
  ...fileSource,
  posterUrl: `https://cdn.example.com/poster.jpg?token=${token}`,
  title: "Signed episode",
});

/** Artwork signed with the same token as the source's poster. */
const artworkFor = (source: VibePlayerSource) => [
  { sizes: "512x512", src: `${source.posterUrl}&size=512` },
];

const audible = {
  muted: false,
  paused: false,
  readyState: "playing",
  volume: 1,
} as const;

afterEach(uninstallFakeMediaSession);

describe("Media Session artwork per source", () => {
  it("evaluates artwork for the current source again after a renewal", async () => {
    const page = installFakeMediaSession();
    const { adapter, controller, settled } = renewalHarness({
      renewSource: async () => signed("fresh"),
    });
    await controller.load(signed("stale"));
    await controller.play();
    adapter(0).emit("playing", { ...audible, currentTime: 12 });
    const connection = connectVibePlayerMediaSession(controller, {
      metadata: { artwork: artworkFor },
    });
    expect(page.metadata?.artwork).toEqual([
      {
        sizes: "512x512",
        src: "https://cdn.example.com/poster.jpg?token=stale&size=512",
      },
    ]);

    adapter(0).fail();
    await settled(2);
    adapter(1).emit("playing", audible);

    expect(page.metadata?.artwork).toEqual([
      {
        sizes: "512x512",
        src: "https://cdn.example.com/poster.jpg?token=fresh&size=512",
      },
    ]);
    connection.disconnect();
    await controller.teardown();
  });

  it("falls back to the poster when the function has no artwork or fails, once per source", async () => {
    const page = installFakeMediaSession();
    const adapter = new TestAdapter();
    const { controller } = createControllerWithAdapter(adapter);
    await controller.load(signed("plain"));
    adapter.emit("playing", audible);
    const poster = [{ src: "https://cdn.example.com/poster.jpg?token=plain" }];
    const resolve = vi.fn(
      (): readonly VibePlayerMediaSessionArtwork[] | undefined => undefined
    );
    const connection = connectVibePlayerMediaSession(controller, {
      metadata: { artwork: resolve },
    });
    expect(page.metadata?.artwork).toEqual(poster);
    adapter.emit("timeupdate", { currentTime: 1 });
    adapter.emit("timeupdate", { currentTime: 2 });
    expect(resolve).toHaveBeenCalledTimes(1);

    const failing = vi.fn(() => {
      throw new Error("Signing failed.");
    });
    connection.update({ metadata: { artwork: failing } });
    // A new function alone does not re-run; the next source does.
    expect(failing).not.toHaveBeenCalled();
    await controller.load(signed("next"));
    adapter.emit("playing", audible);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(page.metadata?.artwork).toEqual([
      { src: "https://cdn.example.com/poster.jpg?token=next" },
    ]);
    connection.disconnect();
    await controller.teardown();
  });

  it("releases the session when the controller retires", async () => {
    const page = installFakeMediaSession();
    const adapter = new TestAdapter();
    const { controller } = createControllerWithAdapter(adapter);
    await controller.load(signed("retire"));
    adapter.emit("playing", audible);
    const connection = connectVibePlayerMediaSession(controller, true);
    expect(page.metadata?.title).toBe("Signed episode");

    await controller.retire();
    connection.update({ active: true });
    expect(page.metadata).toBeNull();
    expect(page.actions).toEqual([]);
    expect(page.playbackState).toBe("none");
    const late = connectVibePlayerMediaSession(controller, { active: true });
    expect(page.metadata).toBeNull();
    late.disconnect();
  });
});
