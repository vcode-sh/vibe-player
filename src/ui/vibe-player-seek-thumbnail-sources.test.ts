import { describe, expect, it } from "vitest";
import {
  createVibePlayerSeekThumbnails,
  parseVibePlayerSeekThumbnailsVtt,
} from "./vibe-player-seek-thumbnail-sources";

describe("seek thumbnail sources", () => {
  it("maps a storyboard grid row by row and stretches the last tile to the end", () => {
    const thumbnails = createVibePlayerSeekThumbnails({
      columns: 2,
      count: 3,
      duration: 27.5,
      height: 90,
      interval: 10,
      url: "/storyboard.jpg",
      width: 160,
    });
    expect(thumbnails).toEqual([
      {
        endTime: 10,
        sprite: { height: 90, width: 160, x: 0, y: 0 },
        startTime: 0,
        url: "/storyboard.jpg",
      },
      {
        endTime: 20,
        sprite: { height: 90, width: 160, x: 160, y: 0 },
        startTime: 10,
        url: "/storyboard.jpg",
      },
      {
        endTime: 30,
        sprite: { height: 90, width: 160, x: 0, y: 90 },
        startTime: 20,
        url: "/storyboard.jpg",
      },
    ]);
  });

  it("reads WebVTT sprite tiles and plain frames, resolving relative URLs", () => {
    const track = [
      "WEBVTT",
      "",
      "1",
      "00:00.000 --> 00:05.000",
      "sheet.jpg#xywh=0,0,160,90",
      "",
      "01:00:05.000 --> 01:00:10.500",
      "https://cdn.example/frame.jpg",
      "",
      "NOTE no cue here",
      "",
    ].join("\r\n");
    expect(
      parseVibePlayerSeekThumbnailsVtt(
        track,
        "https://media.example/v/1/thumbs.vtt"
      )
    ).toEqual([
      {
        endTime: 5,
        sprite: { height: 90, width: 160, x: 0, y: 0 },
        startTime: 0,
        url: "https://media.example/v/1/sheet.jpg",
      },
      {
        endTime: 3610.5,
        startTime: 3605,
        url: "https://cdn.example/frame.jpg",
      },
    ]);
  });
});
