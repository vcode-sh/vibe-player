import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const output = resolve(import.meta.dirname, "fixture/public/media");
mkdirSync(output, { recursive: true });

const common = [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=320x180:rate=6:duration=24",
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "36",
  "-pix_fmt",
  "yuv420p",
  "-g",
  "12",
  "-keyint_min",
  "12",
  "-sc_threshold",
  "0",
];

execFileSync("ffmpeg", [
  ...common,
  "-movflags",
  "+faststart",
  resolve(output, "file.mp4"),
]);

for (const [name, width, height] of [
  ["low", "160", "90"],
  ["high", "320", "180"],
]) {
  execFileSync("ffmpeg", [
    ...common,
    "-vf",
    `scale=${width}:${height}`,
    "-f",
    "hls",
    "-hls_time",
    "2",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    resolve(output, `${name}-%02d.mpegts`),
    resolve(output, `${name}.m3u8`),
  ]);
}

writeFileSync(
  resolve(output, "master.m3u8"),
  `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=80000,RESOLUTION=160x90
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=180000,RESOLUTION=320x180
high.m3u8
`
);

writeFileSync(
  resolve(output, "captions.vtt"),
  `WEBVTT

00:00:00.000 --> 00:00:24.000
Local caption proof
`
);
