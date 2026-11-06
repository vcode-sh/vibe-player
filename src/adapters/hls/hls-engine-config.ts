import type { HlsConfig } from "hls.js";

interface BandwidthEstimate {
  at: number;
  bits: number;
}

let recentBandwidth: BandwidthEstimate | undefined;

/** A short shared estimate avoids re-probing from scratch in dense media lists. */
export function recordHlsBandwidth(bits: number): void {
  if (Number.isFinite(bits) && bits > 0) {
    recentBandwidth = { at: Date.now(), bits };
  }
}

export function createInlineHlsConfig(): Partial<HlsConfig> {
  const savedBandwidth =
    recentBandwidth && Date.now() - recentBandwidth.at < 300_000
      ? recentBandwidth.bits
      : undefined;
  return {
    autoStartLoad: false,
    backBufferLength: 2,
    capLevelToPlayerSize: true,
    maxBufferLength: 8,
    maxMaxBufferLength: 12,
    startLevel: respectsDataSaver() ? 0 : -1,
    // With startLevel -1, hls.js otherwise downloads the lowest lane's first
    // fragment as a discarded bitrate test, then requests it again to play.
    testBandwidth: false,
    ...(savedBandwidth ? { abrEwmaDefaultEstimate: savedBandwidth } : {}),
  };
}

function respectsDataSaver(): boolean {
  if (typeof navigator === "undefined" || !("connection" in navigator)) {
    return false;
  }
  const { connection } = navigator;
  return Boolean(
    connection &&
      typeof connection === "object" &&
      "saveData" in connection &&
      connection.saveData === true
  );
}
