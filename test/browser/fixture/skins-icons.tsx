import type { VibePlayerIconProps, VibePlayerIcons } from "vibe-player/compact";

/** Tabler outline (24/2) and filled paths, as a host would inject them. */
const paths = {
  expand:
    "M16 4l4 0l0 4M14 10l6 -6M8 20l-4 0l0 -4M4 20l6 -6M16 20l4 0l0 -4M14 14l6 6M8 4l-4 0l0 4M4 4l6 6",
  pause:
    "M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2zM17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z",
  play: "M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z",
  refresh:
    "M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",
  replay: "M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5",
  videoOff:
    "M3 3l18 18M15 11v-1l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -.675 .946M10 6h3a2 2 0 0 1 2 2v3m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h1",
  vol: "M15 8a5 5 0 0 1 0 8M17.7 5a9 9 0 0 1 0 14M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5",
  volOff:
    "M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664M3 3l18 18",
};

function icon(path: string, filled = false) {
  return function TablerIcon(props: VibePlayerIconProps) {
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: The package passes aria-hidden; labels sit on the buttons.
      <svg
        {...props}
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d={path} />
      </svg>
    );
  };
}

export const tablerIcons: VibePlayerIcons = {
  fullscreenEnter: icon(paths.expand),
  mute: icon(paths.volOff),
  pause: icon(paths.pause, true),
  play: icon(paths.play, true),
  replay: icon(paths.replay),
  retry: icon(paths.refresh),
  unavailable: icon(paths.videoOff),
  volume: icon(paths.vol),
};
