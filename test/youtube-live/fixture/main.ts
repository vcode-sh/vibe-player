import { createYouTubeAdapter, VibePlayerController } from "vibe-player";
import "vibe-player/styles.css";
import type { LiveYouTubeProbe } from "./probe";
import "./styles.css";

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) {
    throw new Error(`Missing fixture element ${id}`);
  }
  return result as T;
}

const stage = element("stage");
const media = element("media");
const output = element("probe");
const rateSelect = element<HTMLSelectElement>("rate");
const controller = new VibePlayerController({
  adapterFactory: () => createYouTubeAdapter(),
});
const probe: LiveYouTubeProbe = {
  autoplayUserActivation: null,
  commandError: null,
  events: [],
  load: "pending",
  loadError: null,
  remounts: 0,
  samples: [],
  state: controller.getState(),
};
window.youtubeAcceptance = probe;

function render(): void {
  const rates = probe.state.snapshot.playbackRates ?? [];
  rateSelect.replaceChildren(
    ...rates.map((rate) => {
      const option = document.createElement("option");
      option.value = String(rate);
      option.textContent = `${rate}x`;
      option.selected = rate === probe.state.snapshot.playbackRate;
      return option;
    })
  );
  output.textContent = JSON.stringify(probe, null, 2);
}

function command(execute: () => Promise<void>): void {
  execute().catch((error: unknown) => {
    probe.commandError = String(error);
    render();
  });
}

controller.subscribe((state) => {
  probe.state = state;
  probe.events = [...probe.events, state.lastEvent ?? "state"].slice(-100);
  probe.samples = [...probe.samples, state.snapshot].slice(-100);
  render();
});
element("play").addEventListener("click", () =>
  command(() => controller.play())
);
element("pause").addEventListener("click", () =>
  command(() => controller.pause())
);
element("dispose").addEventListener("click", () =>
  command(() => controller.closeSource())
);
element("remount").addEventListener("click", () => {
  command(async () => {
    await controller.mount(media, stage);
    probe.remounts += 1;
    render();
  });
});
rateSelect.addEventListener("change", () =>
  command(() => controller.setPlaybackRate(Number(rateSelect.value)))
);
window.addEventListener("pagehide", () => command(() => controller.teardown()));

async function load(): Promise<void> {
  try {
    await controller.mount(media, stage);
    await controller.load({
      id: "official-youtube-sample",
      origin: window.location.origin,
      title: "Official YouTube IFrame API sample",
      type: "youtube",
      youtubeVideoId: "M7lc1UVf-VE",
    });
    probe.load = "ready";
    render();
    if (new URLSearchParams(window.location.search).has("autoplay")) {
      probe.autoplayUserActivation = navigator.userActivation.hasBeenActive;
      render();
      await controller.play();
    }
  } catch (error) {
    probe.load = "error";
    probe.loadError = String(error);
    render();
  }
}

render();
load();
