# Live YouTube acceptance

This opt-in network lane imports the built `vibe-player` package through its
public exports and uses the default official YouTube SDK runtime. It loads the
public IFrame API sample `M7lc1UVf-VE`. Provider responses, SDK events and browser
media are real; the tests do not intercept requests or inject a provider double.
Keep this lane separate from deterministic CI. CI checks its TypeScript only.

## Run

Install stable Google Chrome if it is absent (`bunx playwright install chrome`).
Build the package before running the fixture:

```bash
bun run build
bun run test:youtube:check
bun run test:youtube
```

The fixture listens on `http://127.0.0.1:5203`. For an actual Chrome window:

```bash
bun run test:youtube --headed
```

On a Linux host without a display, run the windowed lane under Xvfb:

```bash
xvfb-run -a bun run test:youtube --headed
```

The cases verify SDK readiness, advancing playback after a click, the actual
iframe video's paused state, application of an offered playback rate, same-node
remount without player-frame navigation, continued progress and final disposal.
The navigation assertion follows the captured player frame; advertising or
measurement descendants cannot produce a false remount failure.

The separate autoplay case starts audible playback without a gesture under
Chromium's `--autoplay-policy=document-user-activation-required` policy. It must
observe the real SDK's blocked signal and the package's `playblocked` state.
Ordinary autoplay permission remains a browser and host policy decision.

## Stage and controls modes

`youtube-stage.live.ts` renders `VibePlayerStage` with the default runtime. The
default case asserts the embed URL carries `controls=0` and no caption request,
that exactly one package playback bar exists, that no package surface overlaps
the iframe, and then drives real playback, seek, mute, volume, an offered rate
and pause through package controls before closing the Stage and observing iframe
removal.

The native case uses the embeddable, captioned TEDxNewYork talk `8S0FDjFBj8o`
with `controls: "native"`, `captionLanguage: "en"` and
`showCaptionsByDefault: true`. It asserts `controls=1`, `cc_load_policy=1` and
`cc_lang_pref=en`, the absence of package playback controls, playback through a
package keyboard shortcut, the provider's pressed captions button, and that the
provider settings menu offers Quality and Captions. Those last checks read the
provider's accessible names (`Subtitles/CC`, `Playback Settings`), which YouTube
may change. This video proves caption behavior for this fixture only, not for
every video. Screenshots `custom-controls.png` and `native-menu.png` are saved
under each case's output directory for visual review.

## Activation and diagnostics

Playwright's regular JavaScript evaluation supplies a user gesture in Chromium.
The state reader therefore uses CDP `Runtime.evaluate` with `userGesture: false`.
The autoplay case also disables trace snapshots: in the verified toolchain,
enabling tracing changed activation to true before playback dispatch. Its
recorded dispatch precondition must be false. It performs no UI interaction or
locator evaluation until the blocked signal has been observed.

Each case saves `live-youtube-evidence.json` under `test-results/youtube-live/`:
browser version, launch arguments, origin, package samples/events, response
statuses, failed requests, console messages and visible iframe accessibility
content. Failure screenshots remain enabled; the playback case also retains a
failure trace. Request URLs omit query strings. Runs use fresh browser contexts
without account sign-in or imported cookies. The public provider receives
normal network requests; review diagnostic artifacts before sharing them.

An unavailable sample, consent challenge, network failure or provider denial
fails the live case and leaves evidence. There are no automatic retries, skips
or synthetic success paths. Diagnose the recorded boundary before changing
package code. The network lane has no claim about physical keyboard actions,
screen readers, other browsers or relocation into a different container.

## Verified checkpoint

On **2026-10-22**, both cases passed in **Google Chrome 156.0.8078.47** on Linux,
headless and windowed under Xvfb, from `http://127.0.0.1:5203`. The default runtime
loaded the SDK and embed with HTTP 200 and fetched real Googlevideo media.
No provider or network restriction occurred in these final runs.

The SDK offered `[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]`; selecting `0.25`
changed observed playback rate to `0.25`. Playback advanced through repeated
mounting with the same iframe and no additional iframe navigation, then paused
in the actual provider video element. Under the explicit autoplay policy, both
browser modes recorded no activation at dispatch, zero advancing playback and
the real `playblocked` event. These are observations of this sample and
environment; future provider availability and supported rates may differ.

On **2026-10-22**, after embedded YouTube switched to package controls by
default, all four cases (`youtube-autoplay`, `youtube-playback` and both
`youtube-stage` cases) passed in **Google Chrome 156.0.8078.47** on Linux,
headless and windowed under Xvfb. The default embed carried `controls=0`;
package controls advanced playback, seeked, muted, set volume to 0 and 1,
applied the next offered rate (`1.25`) and paused the provider video. YouTube
still drew its title, share button, pause indicator, "More videos" and logo
inside the frame, and showed the TEDxNewYork captions inside the video in
custom mode without a caption request. The native case observed `controls=1`,
`cc_load_policy=1`, `cc_lang_pref=en`, a pressed captions button and a settings
menu listing Quality, Speed and Captions (English).
