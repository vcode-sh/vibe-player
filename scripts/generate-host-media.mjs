import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Generates the synthetic H.264/AAC fMP4 HLS ladders used by the host
 * acceptance lane and the `?demo=adoption` page. Requires FFmpeg with libx264.
 * Output is git-ignored; rerun after a fresh clone.
 */
const repoRoot = resolve(import.meta.dirname, "..");
const outputRoot = join(repoRoot, "test/browser/fixtures/host-media");
const demoLink = join(repoRoot, "demo/vite/public/adoption-media");

const variants = [
  {
    lanes: [
      { bitrate: "2500k", height: 1280, width: 720 },
      { bitrate: "700k", height: 640, width: 360 },
    ],
    name: "portrait",
    seconds: 8,
  },
  {
    lanes: [
      { bitrate: "2500k", height: 720, width: 1280 },
      { bitrate: "700k", height: 360, width: 640 },
    ],
    name: "landscape",
    seconds: 8,
  },
  {
    lanes: [{ bitrate: "1500k", height: 720, width: 1280 }],
    name: "long",
    seconds: 60,
  },
];

function ffmpeg(args, cwd) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], {
    cwd,
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with ${result.status ?? result.signal}.`);
  }
}

function laneArgs(lanes) {
  const [top] = lanes;
  const split = `[0:v]split=${lanes.length}${lanes.map((_, i) => `[s${i}]`).join("")}`;
  const scaled = lanes.map(
    (lane, i) => `[s${i}]scale=${lane.width}:${lane.height}[v${i}]`
  );
  const args = ["-filter_complex", [split, ...scaled].join(";")];
  for (const [index, lane] of lanes.entries()) {
    args.push("-map", `[v${index}]`, "-map", "1:a");
    args.push(`-b:v:${index}`, lane.bitrate);
  }
  const single = lanes.length === 1;
  const streamMap = lanes.map((_, i) => `v:${i},a:${i}`).join(" ");
  return {
    args: [
      ...args,
      "-var_stream_map",
      streamMap,
      "-hls_fmp4_init_filename",
      single ? "init.mp4" : "init_%v.mp4",
    ],
    size: `${top?.width}x${top?.height}`,
  };
}

function generateVariant({ lanes, name, seconds }) {
  const directory = join(outputRoot, name);
  mkdirSync(directory, { recursive: true });
  const { args, size } = laneArgs(lanes);
  ffmpeg(
    [
      "-f",
      "lavfi",
      "-i",
      `testsrc2=size=${size}:rate=30:duration=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:sample_rate=44100:duration=${seconds}`,
      ...args,
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-threads",
      "1",
      "-g",
      "60",
      "-keyint_min",
      "60",
      "-sc_threshold",
      "0",
      "-c:a",
      "aac",
      "-ac",
      "1",
      "-b:a",
      "96k",
      "-fflags",
      "+bitexact",
      "-f",
      "hls",
      "-hls_time",
      "2",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_type",
      "fmp4",
      "-hls_segment_filename",
      "lane%v_%03d.m4s",
      "-master_pl_name",
      "master.m3u8",
      "lane%v.m3u8",
    ],
    directory
  );
  if (name !== "long") {
    ffmpeg(
      [
        "-f",
        "lavfi",
        "-i",
        `testsrc2=size=${size}:rate=30:duration=1`,
        "-frames:v",
        "1",
        "-q:v",
        "4",
        "poster.jpg",
      ],
      directory
    );
  }
}

rmSync(outputRoot, { force: true, recursive: true });
for (const variant of variants) {
  generateVariant(variant);
}
if (!existsSync(demoLink)) {
  symlinkSync(relative(join(demoLink, ".."), outputRoot), demoLink);
}
console.log(`Generated host acceptance media in ${outputRoot}.`);
