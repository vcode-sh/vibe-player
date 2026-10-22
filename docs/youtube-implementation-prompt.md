# YouTube custom controls implementation prompt

Implement this task in `/home/vcode/projects/vibe-player`. Read `AGENTS.md`,
`CLAUDE.md`, and the referenced repository rules first. Complete the implementation
and verification autonomously within this scope. Do not commit, push, or publish.

## Outcome

Make embedded YouTube playback usable with one set of playback controls and
respect the existing provider-agnostic architecture. Default YouTube iframe
playback to our controls outside the video viewport. Provide an explicit native
controls configuration for users who need YouTube's caption and quality menus.
Keep the existing external handoff available as a separate capability.

Full custom YouTube quality selection and a complete custom caption-language
menu are outside the supported API. Do not describe this task as achieving that
parity or removing all YouTube branding.

## Verified provider constraints

- `controls=0` hides the native control bar; `controls=1` displays it.
- `cc_load_policy=1` requests captions initially. `cc_lang_pref` sets a language
  preference. Neither establishes a reliable custom runtime on/off switch.
- `modestbranding` has no effect; `showinfo` was removed. `rel=0` restricts
  recommendations to the same channel rather than disabling them.
  Source: [player parameters](https://developers.google.com/youtube/player_parameters).
- `onApiChange`, `getOptions`, `getOption`, and `setOption` expose caption-module
  options. The documented caption options are `fontSize` and `reload`.
  `track`, `tracklist`, `loadModule`, and `unloadModule` are not documented public
  contracts in the current reference. Do not base production controls on them.
  Source: [IFrame API](https://developers.google.com/youtube/iframe_api_reference#onApiChange).
- Quality getter/list/setter functions are unsupported. `setPlaybackQuality`
  is a no-op; `suggestedQuality` is ignored. A quality-change event does not
  establish a selectable-quality capability.
  Source: [API revision history](https://developers.google.com/youtube/iframe_api_revision_history).
- Data API `captions.list` requires OAuth and returns metadata, not cue text.
  `captions.download` requires permission to edit the video. This is not a public
  caption extraction API for arbitrary YouTube videos.
  Sources: [list](https://developers.google.com/youtube/data/reference/rest/v3/captions/list),
  [download](https://developers.google.com/youtube/data/reference/rest/v3/captions/download).
- Host UI must not cover the embed. Keep the iframe at least 200 by 200 CSS
  pixels and preserve client identification/referrer behavior.
  Source: [embedded player requirements](https://developers.google.com/youtube/terms/required-minimum-functionality).

These are documentation findings, not proof of runtime behavior on every device.
Use the official SDK acceptance lane for implementation evidence. Do not use
private endpoints, scraping, iframe DOM manipulation, stream extraction,
cropping, transparent input shields, or CSS masks to simulate missing APIs.

## Current implementation and ownership

- `src/adapters/youtube/youtube-player-creation.ts` constructs `YT.Player` but
  currently omits `controls`, leaving native controls enabled.
- `youtube-iframe-types.ts` owns the provider SDK boundary;
  `youtube-adapter-load.ts` passes source configuration into the runtime.
- `youtube-adapter-state.ts` advertises playback, forces host controls visible,
  disables custom captions/quality, and advertises a native caption menu.
- `src/adapters/create-vibe-player-adapter.ts` already selects file, HLS,
  YouTube iframe, or YouTube external presentation.
- `src/core/vibe-player-runtime-types.ts` owns normalized capabilities and
  adapter contracts. `vibe-player-source-types.ts` owns source options;
  `vibe-player-source-equality.ts` owns meaningful source comparisons.
- `src/ui/vibe-player-stage.tsx` currently overlays chrome/status on media.
  Its root is already the fullscreen presentation target.
- `src/react/use-vibe-player-captions.ts` loads host WebVTT for file/HLS and
  explicitly excludes YouTube. It does not control provider-native captions.

Keep YouTube implementation and any genuinely needed helper modules inside
`src/adapters/youtube/`. Keep other providers in their existing folders. Reuse
the current adapter, command bridge, and lifecycle. Do not create a second
YouTube playback engine, per-feature adapter factories, or sibling-provider
imports. Extract small helpers only when they have a concrete responsibility.

The checkout contains concurrent work in timeline selection, seek thumbnails,
Stage/Controls props, public exports, docs, and browser fixtures. Re-read the
actual working tree and preserve those changes. Do not restore files or replace
shared files from an earlier revision.

## Implementation contract

1. Add one optional YouTube source option, proposed as
   `controls?: "custom" | "native"`, with `custom` as the deliberate new default.
   Pass it through the existing load/session/SDK boundary to `controls: 0 | 1`.
   Keep `presentation: "iframe" | "external"` unchanged. Update source equality
   for all added configuration. Preserve injected-runtime compatibility through
   optional additions rather than new required methods or fields.
2. Add optional startup caption preferences, proposed as `captionLanguage?:
   string` and `showCaptionsByDefault?: boolean`. Map the former to
   `cc_lang_pref`, and only an explicit true to `cc_load_policy: 1`.
   False/omission must not be documented as forcibly disabling user preferences.
   Do not reload an iframe merely to fake a runtime CC toggle.
3. Add the smallest normalized presentation capability needed by shared UI.
   A proposed single field is `controlsPresentation?: "overlay" | "outside" |
   "provider"`; omission preserves existing overlay rendering. Custom YouTube
   selects outside, native YouTube selects provider. This is a proposed API name,
   not an existing contract. Keep all YouTube-specific decisions in the adapter.
4. For outside presentation, separate the media viewport from surrounding UI.
   Give the viewport its own aspect ratio; put header/actions above and our
   playback bar below. Keep controls visible without hover-only discovery.
   Preserve iframe interaction and include surrounding controls in fullscreen.
   Scrims, tooltips, menus, seek previews, loading/error notices and host actions
   must also remain outside the iframe rectangle, including in small containers.
   Reserve layout space rather than moving overlays with negative offsets.
5. For provider presentation, render native controls and suppress our playback
   controls. Keep normalized playback commands usable by hosts: do not set
   `supportsPlayback` false just to hide UI. Header/close/status UI remains outside
   the embed. Preserve file/HLS overlay layout and behavior.
6. Keep `canShowCaptions: false` and `supportsQualitySelection: false` for the
   YouTube custom-control API. Advertise `hasNativeCaptionsMenu` only in native
   controls mode, as menu ownership rather than proof a video has captions.
   Explain that native captions can still render inside the video in custom mode.
   Do not render an inert CC toggle, fabricated languages, or selectable quality
   levels. Do not add unused SDK caption-module wrappers merely for completeness.
7. Expose caption/quality menu access through the native source configuration
   and demonstrate that configuration in the demo. Do not claim a custom quality
   menu exists. Source mode changes follow the existing source-session lifecycle;
   a seamless runtime switch is not part of this task. Do not introduce automatic
   source reloads or silent handoffs to compensate for unsupported operations.
8. Preserve start offsets, origin/widget referrer, readiness, cancellation,
   stale-session isolation, same-target mounting, disposal, autoplay blocking,
   observed playback rates, and fullscreen ownership. Keep YouTube PiP unsupported.
   Do not change controller persistence, analytics, routing, or other providers'
   source contracts.

No backend, OAuth flow, caption downloading service, external-caption rendering
over YouTube, or additional dependency is needed for this slice. Authorized
caption exports for content owners would be a separate host-owned integration.

## Demo, documentation, and public compatibility

- Show clearly named embedded custom-control and native-control YouTube examples.
  Relabel the existing `YT Headless` example as an external handoff so users do
  not confuse navigation with custom embedded playback; preserve its behavior.
- Document the new default, native menu access, startup caption preferences,
  remaining YouTube elements, and unsupported custom settings in `docs/usage.md`
  and `docs/integration.md`. Update the Unreleased changelog accurately.
- Keep shared UI free of `source.type === "youtube"`, YouTube SDK calls,
  provider-specific iframe selectors, or YouTube storage/routing assumptions.
- Keep exports explicit. Update the public inventory only for deliberately added
  exported symbols and verify documented consumer examples. Preserve existing
  source shapes, factory signatures, seek-thumbnail support, and external mode.
- Follow the 280 LOC hard limit and preferred small-file architecture. All
  artifacts and product copy stay in English. Run the required date command
  before writing any timestamp; do not add an unnecessary timestamp.

## Verification and completion

Read the repository `testing-patterns` skill before changing tests. Use a short
plan, focused regressions for changed behavior, and economical RED phases where
stable. Do not duplicate existing lifecycle suites or mock internal helpers to
prove implementation order.

Acceptance must establish:
- Custom mode passes the correct SDK parameters and shows one host playback bar.
  Native mode shows no duplicate host playback controls. Startup caption options
  reach the SDK, including omission semantics, and same-ID configuration changes
  are observable without breaking existing injected runtimes.
- Capability-driven UI keeps unsupported CC/quality controls absent, while native
  mode provides access to the provider menus when offered by the selected video.
- In real browser screenshots and bounding-box checks, surrounding chrome and
  open menus/previews/status never cover the iframe. Check ordinary and narrow
  containers, fullscreen, keyboard focus and iframe reachability. Keep the actual
  embed viewport above its minimum size; allow the media ratio to adapt if needed.
- File/HLS rendering, playback, seek previews, captions and fullscreen remain
  functional. External YouTube remains a handoff without embedded playback.
- The real official-SDK lane proves advancing playback, seek/pause, mute/volume,
  supported rates and teardown with the new default. Use an embeddable captioned
  fixture to verify requested caption rendering and native menu access. Record
  availability limitations honestly; never turn provider denial into a passing
  fake. The existing sample alone does not prove caption support for all videos.

Use focused lint/type/Vitest and browser runs during development. On the stable
tree, run `bun run ci` once: this public-contract/shared-UI change warrants its
package boundary, rules, build, consumer, exports, publint, ATTW and deterministic
browser gates. Do not separately repeat gates already passed by that command.
Then run `bun run test:youtube` against the built package and headed Chrome for
visual acceptance, following `test/youtube-live/README.md`. Reuse valid evidence
until the relevant files or environment change. Report unrelated concurrent
failures without fixing other work. Do not claim physical Safari/iOS or native
assistive-technology acceptance without those checks.

Finish with a concise report of changed behavior, module ownership, executed
checks, browser evidence, and the remaining provider limitations. Distinguish
working custom playback from unavailable custom caption/quality selection.
