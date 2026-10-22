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
npm install vibe-player
pnpm add vibe-player
bun add vibe-player
```

```tsx
import "vibe-player/styles.css";
import { VibePlayerStage } from "vibe-player";

export function Film() {
  return (
    <VibePlayerStage
      source={{
        id: "launch-film",
        manifestUrl: "https://example.com/video/master.m3u8",
        posterUrl: "https://example.com/video/poster.jpg",
        title: "Launch film",
        type: "hls",
      }}
    />
  );
}
```

## What You Get

- direct MP4/WebM playback through native video
- adaptive HLS through managed `hls.js`, with native fallback
- official YouTube iframe playback
- compliant YouTube external handoff when iframe chrome is the wrong answer
- package-owned controls, timeline, captions, volume, quality, PiP, fullscreen
- keyboard shortcuts and real tooltips instead of browser-default mystery meat
- package-owned headless lifecycle, controller, volume, and quality helpers
- state observers and source-aware errors for host integrations
- ambient preview primitives and a neutral cinematic skin
- media delivery audit CLI for catching bad MP4/CDN/CORS decisions early

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
