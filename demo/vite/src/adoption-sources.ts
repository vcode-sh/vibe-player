import type { VibePlayerHlsSource } from "vibe-player";

/** Generated local fMP4 ladders also used by browser acceptance. */
export const portraitSource: VibePlayerHlsSource = {
  durationSeconds: 8,
  height: 1280,
  id: "adoption-portrait",
  posterUrl: "/adoption-media/portrait/poster.jpg",
  title: "Portrait field notes",
  type: "hls",
  url: "/adoption-media/portrait/master.m3u8",
  width: 720,
};

export const landscapeSource: VibePlayerHlsSource = {
  durationSeconds: 8,
  height: 720,
  id: "adoption-landscape",
  posterUrl: "/adoption-media/landscape/poster.jpg",
  title: "A moment from the gathering",
  type: "hls",
  url: "/adoption-media/landscape/master.m3u8",
  width: 1280,
};

export const loadLightHls = () => import("hls.js/light");
