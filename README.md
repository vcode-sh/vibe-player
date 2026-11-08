# Vibe Player

[![npm](https://img.shields.io/npm/v/vibe-player?style=flat-square)](https://www.npmjs.com/package/vibe-player)
[![license](https://img.shields.io/npm/l/vibe-player?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/react-19-61dafb?style=flat-square&logo=react&logoColor=111)](https://react.dev/)
[![Sponsor vcode-sh](https://img.shields.io/badge/sponsor-vcode--sh-ea4aaa?style=flat-square&logo=github-sponsors&logoColor=white)](https://github.com/sponsors/vcode-sh)

Video players are easy, right up until they are not.

`vibe-player` is a cinematic React player package for teams that
want polished playback without inheriting someone else's product app. Files,
HLS, YouTube iframe playback, compliant YouTube external handoff, captions,
keyboard shortcuts, volume, quality, PiP, fullscreen, tooltips, and a clean
headless path all live behind one provider-agnostic API.

Built by [Vibe Code](https://x.com/vcode_sh). Say hi at
[hello@vcode.sh](mailto:hello@vcode.sh).

## Install

```bash
npm install vibe-player hls.js
pnpm add vibe-player hls.js
bun add vibe-player hls.js
```

```tsx
import "vibe-player/styles.css";
import { VibePlayerCompact } from "vibe-player/compact";

export function Film() {
  return (
    <VibePlayerCompact
      source={{
        id: "launch-film",
        url: "https://example.com/video/master.m3u8",
        posterUrl: "https://example.com/video/poster.jpg",
        title: "Launch film",
        type: "hls",
        width: 1080,
        height: 1920,
        durationSeconds: 45,
      }}
    />
  );
}
```

## What You Get

- direct MP4/WebM playback through native video
- adaptive HLS through injectable `hls.js`, with native HLS where needed
- poster-only inline startup, renewable private URLs, and deterministic cleanup
- compact chat, feed, full viewer, and headless variants
- official YouTube iframe playback
- compliant YouTube external handoff when iframe chrome is the wrong answer
- package-owned controls, timeline, captions, volume, quality, PiP, fullscreen
- keyboard shortcuts and real tooltips instead of browser-default mystery meat
- package-owned headless lifecycle, controller, volume, and quality helpers
- state observers and source-aware errors for host integrations
- ambient preview primitives and a neutral cinematic skin
- media delivery audit CLI for catching bad MP4/CDN/CORS decisions early

`VibePlayerInline` and `VibePlayerCompact` default to `load="onPlay"`:
mounting downloads no video, playlist, segment, or HLS runtime. The poster can
load immediately. Choose `load="eager"` to prepare playback at mount, or
`load="visible"` to prepare it on intersection. The bare hook and manual
controller retain eager loading unless requested otherwise.

## Public API

| Entry                    | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `vibe-player/compact`    | `VibePlayerCompact`, compact/feed chrome and its types    |
| `vibe-player/stage`      | `VibePlayerStage`, full controls and assemblies           |
| `vibe-player/hook`       | `useVibePlayer`, controller bindings and host audio focus |
| `vibe-player/styles.css` | Scoped styles and host-overridable CSS variables          |
| `vibe-player`            | Complete API, adapters, captions, previews and skins      |

Client entry points carry `"use client"`; imports are safe during SSR. JavaScript
is side-effect-free so bundlers can discard unused variants. `hls.js` is a peer
dependency (`^1.6.0`); the host provides its one installed copy. MP4 playback
does not import the HLS runtime.

Sources accept `{ id, url, type: "hls" | "mp4", width?, height?,
durationSeconds?, posterUrl?, expiresAt? }`. Existing `type: "file"` source
lists, HLS `manifestUrl`, and YouTube sources remain supported. Frame ratios
follow source dimensions or decoded metadata, clamped to `minRatio` / `maxRatio`
(9:16 through 16:9 by default); `className` and `style` own host sizing.
`fit="cover"` crops poster and video into a clamped frame instead of
letterboxing.

Pass `renewSource` for expiring credentials. The player renews within 30 seconds
of expiry at Play and after recoverable fatal failures, keeps the position and
latest playback intent, and fences stopped or replaced sessions. A failed lapse
gets one automatic renewal; actual playback earns a new retry budget. Fatal
failures show Retry; recoverable engine diagnostics are available through
`onEvent` without interrupting the UI.

`controllerRef` exposes `play()`, `pause()`, `stop()`, `seek()` / `seekTo()`,
`setMuted()`, `getState()` and `subscribe()`. Stop releases media and retains
the source for a later Play. Host callbacks include `onPlay`, `onPause`,
`onEnded`, `onError`, `onRenew`, throttled `onProgress`, `onQualityChange`,
`onEvent`, and the existing `onAnalyticsEvent`.

Customize `icons`, `labels`, the time formatter, and `classNames` part slots.
Theme tokens include `--vibe-player-text`, `--vibe-player-surface`,
`--vibe-player-stage-background`, `--vibe-player-accent`, `--vibe-player-border`,
`--vibe-player-radius`, `--vibe-player-control-size`, `--vibe-player-icon-size`,
`--vibe-player-spacing`, `--vibe-player-font`, and `--vibe-player-focus-color`.
Times default to `0:07` / `1:05:09`.

Compact and feed players come in two skins over one surface:
`<VibePlayerCompact skin="glass" />` (Glass Capsule, the default) and
`skin="chips"` (Ink Chips; also import `vibe-player/chips.css`). While playing
nothing covers the video; controls hide after 1.4 s (glass) or 1.2 s (chips)
without pointer activity, or `controlsHideDelay` ms, and at once when the mouse
leaves. Full chrome waits 2400 ms. Only keyboard focus on a control keeps them
visible. `controls`, `slots`, `onExpand` and `renderOverlay` customise the
compact surface; see [Compact Skins](./docs/usage.md#compact-skins).
`host` moves one playing compact player between host elements (inline slot,
mini-player) without restarting it; see
[Detached Hosts](./docs/usage.md#detached-hosts). `timelineBackground` and
`VibePlayerHeatmap` draw a "most replayed" line over the timeline while the
viewer hovers or scrubs it, with the seek frame above it, and the opt-in
`onWatchedRanges` reports the ranges actually watched so the host can
aggregate them.
`VibePlayerModal` starts playback when it opens; pass `autoPlay={false}` to
wait for Play.
`audioFocus` groups coordinate audible players and host media. Hidden tabs and
offscreen players release playback by default; each policy can be disabled.
The opt-in `mediaSession` drives lock-screen and media-key controls for the
audible player; see
[System Media Controls](./docs/usage.md#system-media-controls).
Autoplay while visible is opt-in and muted. Hosts own session retirement and
should call `stop()` or close/unmount the player when access ends.

## Private HLS Hosts

A host serving private HLS with renewable credentials can pass
`loadHls={() => import("hls.js/light")}`, inject its own labels and icons, renew
expiring URLs with `renewSource`, retire sessions with `stop()`, and share audio
focus with its own media. Routing, authorization, uploads, and persistence stay
in the host. See [Host Hooks](./docs/usage.md#host-hooks) in the usage guide.

## Docs

- [Usage Guide](./docs/usage.md): setup, sources, autoplay, audio, captions,
  headless controls, demo, and media audit.
- [Integration Guide](./docs/integration.md): app contract, media rules,
  CORS, hooks, and replacement checklist.
- [Media Delivery Audit](./docs/media-delivery.md): CLI output, CI mode,
  rollout decisions, CORS credentials, and size policy.
- [Contributing](./CONTRIBUTING.md): repo rules, PR shape, tests, and API
  changes.

## Local Demo

```bash
bun run demo:vite
bun run demo:vite:packaged
```

The demo exercises file, HLS, YouTube iframe, and YouTube external handoff
modes through the real package player. No pretend product shell required.
Open `?demo=adoption` for local portrait/landscape fMP4 in a 236 px chat bubble,
feed card, viewer, and custom headless surface. These fixture videos are generated
test patterns, not product media.

## Bundle Size

`bun run package:size` measures built output and enforces an initial combined
compact + hook budget of **19,500 B gzip**, excluding React, React DOM, and
`hls.js`. Provider bridges and the Ink Chips skin are separate chunks loaded
on first use; the report also includes their deferred bytes and the complete
consumer bundle.

| Gzip measurement                |           0.2.1 baseline |    0.3.0 |
| ------------------------------- | -----------------------: | -------: |
| Initial compact + hook consumer |       No compact variant | 18,055 B |
| Deferred bridges + Chips skin   | Included in initial code | 10,853 B |
| Complete consumer JavaScript    |                 45,985 B | 28,908 B |
| All package ESM files           |                 26,672 B | 40,825 B |
| Package stylesheet              |                  6,634 B |  9,107 B |
| Ink Chips stylesheet (opt-in)   |                        — |  1,857 B |

The baseline consumer uses the former full Stage plus hook, including captions;
the new consumer uses compact plus hook. Both measurements use a minified Vite
application, include non-peer dependencies, exclude React/React DOM/hls.js, and
sum each emitted chunk's gzip size. The initial budget includes every static
dependency; provider bridges load on activation. All package ESM files retain
their separate 42 KiB gzip limit.

## Media Audit

```bash
npx --package vibe-player vibe-player-media-audit https://cdn.example.com/video.mp4 --origin https://app.example.com
```

Use this before blaming the player for a slow, frozen, non-faststart, CORS-bent
MP4. The CLI checks range delivery, MP4 `moov`/`mdat` ordering, CORS, size, and
direct-file rollout readiness.

## Sponsor

If Vibe Player saves you from writing this stack again, consider sponsoring
Vibe Code: [github.com/sponsors/vcode-sh](https://github.com/sponsors/vcode-sh)

## License

Apache-2.0
