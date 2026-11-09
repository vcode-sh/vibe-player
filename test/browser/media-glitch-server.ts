import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const mediaRoot = resolve(import.meta.dirname, "fixture/public/media");
const packetSize = 188;
const glitchSegment = 4;
const segmentCount = 12;

interface TsPacket {
  end: number;
  payloadStart: number;
  pid: number;
  unitStart: boolean;
}

function readPacket(data: Uint8Array, offset: number): TsPacket | null {
  const flags = data[offset + 1] ?? 0;
  const control = Math.floor((data[offset + 3] ?? 0) / 16) % 4;
  if (control === 2) {
    return null;
  }
  const adaptation = control === 3 ? 1 + (data[offset + 4] ?? 0) : 0;
  return {
    end: offset + packetSize,
    payloadStart: offset + 4 + adaptation,
    pid: (flags % 32) * 256 + (data[offset + 2] ?? 0),
    unitStart: Math.floor(flags / 64) % 2 === 1,
  };
}

function isVideoPesStart(data: Uint8Array, packet: TsPacket): boolean {
  const at = packet.payloadStart;
  return (
    packet.unitStart &&
    data[at] === 0 &&
    data[at + 1] === 0 &&
    data[at + 2] === 1 &&
    data[at + 3] === 0xe0
  );
}

/**
 * Keeps every MPEG-TS and PES header intact, so the segment still parses and
 * appends, but scrambles the H.264 slice data in the video PES continuation
 * packets: the decoder itself fails (`MEDIA_ERR_DECODE` in Chromium).
 */
export function scrambleVideoSlices(segment: Uint8Array): Uint8Array {
  const data = Uint8Array.from(segment);
  const packets: TsPacket[] = [];
  for (
    let offset = 0;
    offset + packetSize <= data.length;
    offset += packetSize
  ) {
    const packet = readPacket(data, offset);
    if (packet) {
      packets.push(packet);
    }
  }
  const videoPids = new Set(
    packets.filter((packet) => isVideoPesStart(data, packet)).map((p) => p.pid)
  );
  for (const packet of packets) {
    if (videoPids.has(packet.pid) && !packet.unitStart) {
      for (let index = packet.payloadStart; index < packet.end; index += 1) {
        data[index] = 255 - (data[index] ?? 0);
      }
    }
  }
  return data;
}

function playlist(base: string): string {
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-TARGETDURATION:2",
    "#EXT-X-MEDIA-SEQUENCE:0",
    "#EXT-X-PLAYLIST-TYPE:VOD",
  ];
  for (let index = 0; index < segmentCount; index += 1) {
    const name = `high-${String(index).padStart(2, "0")}.mpegts`;
    lines.push(
      "#EXTINF:2.000000,",
      index === glitchSegment ? `${base}/${name}` : `/media/${name}`
    );
  }
  lines.push("#EXT-X-ENDLIST", "");
  return lines.join("\n");
}

/**
 * `/glitch/<mode>/<run>/stream.m3u8` is the local HLS rendition whose fifth
 * segment fails to decode: always (`always`), or only the first time a run
 * requests it (`once`), like a transient decoder or delivery fault.
 */
export function mediaGlitchServer(): Plugin {
  const served = new Set<string>();
  const original = readFileSync(
    resolve(mediaRoot, `high-0${glitchSegment}.mpegts`)
  );
  const scrambled = scrambleVideoSlices(original);
  return {
    configureServer(vite) {
      vite.middlewares.use("/glitch", (request, response) => {
        const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        const [mode = "", run = "", file = ""] = path
          .split("/")
          .filter(Boolean);
        response.setHeader("Cache-Control", "no-store");
        if (file === "stream.m3u8") {
          response.setHeader("Content-Type", "application/vnd.apple.mpegurl");
          response.end(playlist(`/glitch/${mode}/${run}`));
          return;
        }
        const key = `${mode}/${run}`;
        const faultAlreadyServed = mode === "once" && served.has(key);
        served.add(key);
        response.setHeader("Content-Type", "video/mp2t");
        response.end(faultAlreadyServed ? original : scrambled);
      });
    },
    name: "media-glitch-fixture",
  };
}
