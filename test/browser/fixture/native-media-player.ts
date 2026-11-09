import {
  createFileAdapter,
  VibePlayerController,
  type VibePlayerFileSource,
} from "vibe-player";

export interface NativeMediaProbe {
  analytics: string[];
  errors: { kind: string; phase: string }[];
  play: string;
  renewals: number;
}

const scenario = new URLSearchParams(window.location.search).get("scenario");

function fileSource(id: string, ...urls: string[]): VibePlayerFileSource {
  return {
    id,
    sources: urls.map((url) => ({
      mimeType: url.endsWith(".webm") ? "video/webm" : "video/mp4",
      url,
    })),
    type: "file",
  };
}

function createSource(): VibePlayerFileSource {
  if (scenario === "missing") {
    return fileSource(
      "missing",
      "/failures/missing.mp4",
      "/failures/missing.webm"
    );
  }
  if (scenario === "signed") {
    return fileSource("signed", "/failures/signed.mp4?token=expired");
  }
  return fileSource("local", "/media/file.mp4");
}

const probe: NativeMediaProbe = {
  analytics: [],
  errors: [],
  play: "idle",
  renewals: 0,
};
const source = createSource();

function renewSource(): Promise<VibePlayerFileSource> {
  probe.renewals += 1;
  return Promise.resolve(
    fileSource(source.id, "/failures/signed.mp4?token=fresh")
  );
}
const controller = new VibePlayerController({
  adapterFactory: createFileAdapter,
  onAnalyticsEvent: (event) => probe.analytics.push(event.type),
  onError: (error) =>
    probe.errors.push({ kind: error.kind, phase: error.phase }),
  ...(scenario === "signed" ? { renewSource } : {}),
});
const target = document.getElementById("player");
if (!target) {
  throw new Error("Missing native media fixture target.");
}
await controller.mount(target);
await controller.setMuted(true);
await controller.load(source, "onPlay");

/** Starts playback and records how the controller's play() settled. */
function play(): void {
  probe.play = "pending";
  controller.play().then(
    () => {
      probe.play = "resolved";
    },
    (cause: unknown) => {
      probe.play = `rejected: ${cause instanceof Error ? cause.name : "unknown"}`;
    }
  );
}

Object.assign(window, { nativeMedia: { controller, play, probe } });
