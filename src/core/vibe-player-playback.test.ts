import { expect, it } from "vitest";
import { fileSource } from "./vibe-player-controller-test-helpers";
import {
  type VibePlayerPlayback,
  VibePlayerPlaybackLifecycle,
} from "./vibe-player-playback";
import type { VibePlayerAdapterEvent } from "./vibe-player-runtime-types";
import { createIdleSnapshot } from "./vibe-player-time";

function event(
  type: VibePlayerAdapterEvent["type"],
  paused = false
): VibePlayerAdapterEvent {
  return { snapshot: { ...createIdleSnapshot(), paused }, type };
}

it("names why each playback began and keeps it otherwise", () => {
  const started: VibePlayerPlayback[] = [];
  const lifecycle = new VibePlayerPlaybackLifecycle((playback) => {
    started.push(playback);
  });
  const renewed = { ...fileSource, id: "video-2" };
  lifecycle.load(fileSource);
  lifecycle.observe(fileSource, event("playing"));
  lifecycle.observe(fileSource, event("ended", true));
  lifecycle.observe(fileSource, event("seeking", true));
  lifecycle.observe(fileSource, event("play"));
  lifecycle.observe(fileSource, event("playing"));
  // A renewal that returns another id, without a host load.
  lifecycle.observe(renewed, event("playing"));
  lifecycle.load(renewed);
  expect(
    started.map(({ cause, source }) => ({ cause, sourceId: source.id }))
  ).toEqual([
    { cause: "load", sourceId: "video-1" },
    { cause: "replay", sourceId: "video-1" },
    { cause: "source", sourceId: "video-2" },
    { cause: "load", sourceId: "video-2" },
  ]);
  expect(new Set(started.map(({ id }) => id)).size).toBe(4);
  expect(lifecycle.playback).toBe(started.at(-1));
});
