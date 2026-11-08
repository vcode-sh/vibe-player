# Vite demo

Two pages over the real package:
- `/` — **Feature showcase.** Every public feature with a working example
  and the props it uses: compact and feed players in both skins, the full
  stage with captions, quality and speed, inline and modal viewers, skip
  buttons and double-tap seek with a `seekStep` switch, the detached host (floating mini-player), the timeline heatmap with seek
  thumbnails, watched ranges, analytics and resume, Media Session and
  Picture-in-Picture, and headless controls. `?demo=adoption` opens the same
  page.
- `?demo=workbench` — **Provider workbench.** One full stage switching between
  remote file, HLS, Bunny Stream, YouTube iframe and YouTube handoff sources,
  with live state and analytics.

## Generate the local media first

The showcase plays generated test-pattern clips that are not committed. After
a fresh clone, generate them once (FFmpeg with libx264 required):

```bash
bun run test:browser:host:media
```

This writes `test/browser/fixtures/host-media/` (portrait, landscape and a
60 s clip, posters and the landscape storyboard sprite) and links it as
`demo/vite/public/adoption-media`. Without it the showcase shows a notice and
its players cannot play; the workbench still works with its remote sources.

`public/seek/landscape-storyboard.vtt` is committed: it describes that
generated storyboard as a WebVTT thumbnail track for the
`parseVibePlayerSeekThumbnailsVtt` example. The committed `public/seek/*.jpg`
sprites belong to the workbench's remote sources; regenerate them with
`bun demo/vite/scripts/generate-seek-sprites.ts`.

## Run

```bash
bun run demo:vite            # source aliases, fast package work
bun run demo:vite:packaged   # builds dist and consumes the package exports
bun run demo:vite:verify     # type check, build and packaged build
```

## Seeing the system integrations

- **Media Session:** play the first clip in "System controls", then open
  Chrome's media control (toolbar) or the OS media controls, or press a
  media key. The owner example switches the session between two players with
  `mediaSession.active`.
- **Picture-in-Picture:** start it from the chips player's PiP button and
  scroll away; the window keeps playing.
- **Resume:** play the analytics clip for a few seconds, reload and press Play.
- **Double-tap seek:** touch only. In Chrome DevTools turn on the device
  toolbar (Ctrl+Shift+M) or touch emulation, then double-tap the left or right
  third of a player in "Skip and double-tap seek". J / L and ← / → use the
  same step on a focused player.
- **YouTube floating:** a YouTube iframe moves without reloading only where
  `Element.moveBefore()` exists (Chromium); the showcase floats file/HLS
  media only.
