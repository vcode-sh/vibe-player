# Vibe Player Plan

Status: in progress; Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, and Phase 9 complete; Phase 8 Discovery integration in runtime hardening pass; standalone Vite demo complete with YouTube iframe and external handoff modes
Created: 2026-06-08 19:52 CEST
Last verified: 2026-06-09 08:50 CEST
Target: standalone reusable video-player package with Discovery-grade UI, motion, and multi-provider playback
Primary implementation location: `/Users/tomrobak/_projects_/vibe-player`
Reference source location: `/Users/tomrobak/_projects_/spreadoo/apps/web/src/features/discover`
Later integration target: `/Users/tomrobak/_projects_/spreadoo/apps/web/src/features/discover`
Current package name: `@vibe-code/vibe-player`

## Executive Verdict

This should be built as a **standalone package first**, not as a direct refactor of `discover`.

That is the right move because:

- the current Discover player already contains high-quality UI and interaction ideas worth preserving;
- the current implementation is still structurally tied to native `<video>` playback, Discover telemetry, Discover overlay composition, and Discover data contracts;
- YouTube and HLS support will force a new playback abstraction anyway, so extracting the current player 1:1 would create the wrong foundation;
- the package can become a reusable internal standard for all future video surfaces, while Discovery later becomes only one branded consumer.

The package must preserve the **cinematic feel, motion quality, chrome behavior, and transition discipline** from Discovery. That is a hard requirement, not a nice-to-have.

## Non-Negotiable Product Requirements

1. Discovery-level motion quality must survive extraction.
2. The package must work without any Discover runtime dependency.
3. The package must support multiple playback backends through adapters, not through `if source.type === ...` spread across UI.
4. The package must stay React-first and app-agnostic: no Next-only assumptions, no router assumptions, no telemetry assumptions.
5. The package must be usable in at least three modes:
   - inline player
   - modal/lightbox player
   - ambient/background-preview plus full-player handoff
6. The package must be able to play:
   - direct MP4/WebM files
   - HLS streams
   - YouTube videos
7. The package must expose clean seams for:
   - analytics
   - resume persistence
   - captions
   - provider capabilities
   - branded skins/themes

## Repo-Grounded Current-State Assessment

### Current implementation snapshot

Verified in `/Users/tomrobak/_projects_/vibe-player` on 2026-06-09 08:14 CEST:

- package scaffold exists in `package.json` for ESM build, typecheck, lint, Vitest, publint, and ATTW
- source union, capability model, normalized event names, adapter contract, resume seam, and analytics seam exist in `src/core/vibe-player-types.ts`
- top-level public core contract exports in `src/core/vibe-player-types.ts` now have concise TSDoc that appears in generated `dist/index.d.ts`
- controller lifecycle, command forwarding, resume restore, adapter swap, and session analytics exist in `src/core/vibe-player-controller.ts`
- controller play/seek command details live in internal `src/core/vibe-player-controller-commands.ts`
- controller play commands now immediately surface a provider-agnostic play intent as `lastEvent: "play"`, `playbackBlocked: false`, and a `buffering` snapshot before provider playback events arrive, improving feedback for slow progressive MP4 startup without changing analytics semantics
- controller load create/mount/load/error/resume orchestration lives in internal `src/core/vibe-player-controller-load.ts`
- controller load-error and resume-restore details are split into internal helpers so `src/core/vibe-player-controller.ts` is no longer at the hard LOC edge
- controller source identity is now committed before adapter mount/load events, so providers that emit `ready` during asynchronous startup still expose `currentSource` to host UI, resume, and analytics paths
- progress milestone helper exists in `src/core/vibe-player-events.ts`
- resume restore guard helper exists in `src/core/vibe-player-resume.ts`
- shared controller test helpers exist in `src/core/vibe-player-controller-test-helpers.ts`
- session analytics deduplication and progress event creation exist in `src/core/vibe-player-analytics.ts`
- initial controller state creation exists in `src/core/vibe-player-controller-state.ts`
- time formatting, duration, clamp, idle snapshot, and idle capabilities helpers exist in `src/core/vibe-player-time.ts`
- native file adapter exists in `src/adapters/create-file-adapter.ts`
- shared adapter listener contract exists in internal `src/adapters/adapter-listener.ts`
- file adapter DOM helpers exist in `src/adapters/file-adapter-dom.ts`
- native file adapter keeps native caption tracks disabled so the custom caption overlay is the single caption renderer
- HLS adapter exists in `src/adapters/create-hls-adapter.ts`
- HLS adapter DOM helpers exist in `src/adapters/hls-adapter-dom.ts`
- HLS managed/native load and fallback orchestration lives in internal `src/adapters/hls-adapter-load.ts`
- HLS adapter load invalidation now uses a dedicated load generation, separate from native playback generation, so async managed HLS callbacks stay live after autoplay/playback commands while stale attach/fallback paths are still ignored
- HLS async load-session regression coverage lives in internal `src/adapters/create-hls-adapter-load-session.test.ts`, keeping `src/adapters/create-hls-adapter.test.ts` at 181 LOC and the new load-session spec at 91 LOC
- HLS adapter quality state lives in internal `src/adapters/hls-adapter-quality-state.ts`
- HLS quality helpers exist in `src/adapters/hls-quality.ts`
- managed HLS runtime bridge exists in `src/adapters/hls-managed-runtime.ts`
- HLS runtime contract types exist in `src/adapters/hls-runtime-types.ts`
- shared native video DOM helpers exist in `src/adapters/native-video-dom.ts`
- shared native guarded-play, playback command, volume, fullscreen, Picture-in-Picture, and cleanup helpers exist in `src/adapters/native-video-playback.ts`
- native file and HLS adapters now reset source/video state on unmount, and their capability helpers return idle capabilities when no source is active
- shared native adapter test helpers exist in `src/adapters/native-video-test-helpers.ts`
- file adapter fixtures and loaded-adapter test harnesses live in internal `src/adapters/file-adapter-test-helpers.ts`
- HLS adapter test fixtures live in internal `src/adapters/hls-adapter-test-helpers.ts`
- React binding exists in `src/react/use-vibe-player-controller.ts`
- caption loading hook exists in `src/react/use-vibe-player-captions.ts`
- idle chrome hook exists in `src/react/use-vibe-player-chrome.ts`
- overlay presence hook exists in `src/react/use-vibe-player-overlay-presence.ts`
- shortcut binding hook exists in `src/react/use-vibe-player-shortcuts.ts`
- modal, inline, shell, and shared stage components exist in `src/ui`
- custom caption overlay exists in `src/ui/vibe-player-caption-overlay.tsx`
- package-owned controls exist in `src/ui/vibe-player-controls.tsx`
- bottom chrome button helpers live in internal `src/ui/vibe-player-bottom-control-buttons.tsx`
- inline player assembly exists in `src/ui/vibe-player-inline.tsx`
- modal player assembly exists in `src/ui/vibe-player-modal.tsx`
- shared player stage exists in `src/ui/vibe-player-stage.tsx`
- shared stage command and shortcut action wiring lives in internal `src/ui/use-vibe-player-stage-actions.ts`
- shared stage muted-autoplay bootstrap now keeps bootstrapped playback muted after start, instead of unmuting immediately and risking a browser-policy pause
- shared stage unmute action now retries `play()` when unmuting a source that was already playing, so the explicit user gesture can recover from browser-policy pauses
- shared stage test helpers exist in `src/ui/vibe-player-stage-test-helpers.ts`
- documented public stage props live in `src/ui/vibe-player-stage-types.ts` and are re-exported from the stage entrypoint
- package-owned timeline exists in `src/ui/vibe-player-timeline.tsx`
- controls CSS lives in `src/styles/vibe-player-controls.css` and is imported from `src/styles/vibe-player.css`
- timeline CSS lives in `src/styles/vibe-player-timeline.css` and is imported from `src/styles/vibe-player.css`
- modal overlay/backdrop CSS lives in `src/styles/vibe-player-modal.css` and is imported from `src/styles/vibe-player.css`
- preview CSS lives in `src/styles/vibe-player-preview.css` and is imported from `src/styles/vibe-player.css`
- preview browser test helpers live in `src/preview/vibe-player-background-preview-test-helpers.ts`
- Discovery-reference cinematic skin tokens live in `src/skins/cinematic-default/tokens.ts`
- the first exported skin preset is now explicitly neutral-cinematic through `cinematicDefaultSkin.metadata.intent: "neutral-cinematic"`
- `cinematicDefaultSkin.classNames.root` exposes the stable wrapper class `vibe-player-skin--cinematic-default`
- `src/skins/vibe-player-skin-types.ts` defines the package-level skin preset, metadata, intent, color-scheme, and class-name contracts
- `src/skins/index.ts` is the local skins barrel, and the root package export now re-exports `./skins`
- ambient preview package exports live in `src/preview`
- `VibePlayerBackgroundPreview` owns poster/video crossfade layers independently of the modal player
- `VibePlayerBackgroundPreview` scopes cross-remount previous-layer preservation through an explicit `preserveKey`, so unrelated preview instances do not inherit stale module-level state
- `VibePlayerBackgroundLayer` remains an internal implementation detail and is no longer exported through the public preview barrel or root package types
- `VibePlayerAmbientPreview` wraps the background preview with optional `onActivate` handoff behavior without owning player internals
- WebVTT parsing and active-caption lookup exist in `src/captions/parse-webvtt.ts`
- runtime QA harnesses exist in `demo/phase3-runtime.html`, `demo/phase5-hls-runtime.html`, `demo/phase6-youtube-runtime.html`, and `demo/phase7-ambient-preview-runtime.html`
- current tests cover controller lifecycle, command forwarding, adapter swap, resume, analytics, progress milestones, native file adapter behavior, HLS adapter behavior, YouTube adapter behavior, ambient preview behavior, inline player assembly behavior, modal player assembly behavior, caption hook behavior, idle chrome behavior, overlay presence behavior, caption overlay rendering, controls, timeline, shortcuts, playback-rate cycling, time helpers, and WebVTT parsing
- YouTube adapter exists in `src/adapters/create-youtube-adapter.ts`
- YouTube player creation, timeout, and late-resolve cleanup live in internal `src/adapters/youtube-adapter-load.ts`
- YouTube iframe API loader/runtime bridge exists in `src/adapters/youtube-iframe-runtime.ts`
- YouTube iframe API contract types exist in `src/adapters/youtube-iframe-types.ts`
- YouTube snapshot and capability normalization lives in `src/adapters/youtube-adapter-state.ts`
- YouTube provider state-change normalization lives in internal `src/adapters/youtube-adapter-state-change.ts`
- YouTube sampled `timeupdate` lifecycle lives in internal `src/adapters/youtube-time-updates.ts`
- YouTube play, pause, seek, mute, rate, volume, and fullscreen command forwarding lives in internal `src/adapters/youtube-adapter-commands.ts`
- official YouTube research on 2026-06-09 confirmed that true hidden/headless YouTube playback is not a compliant package mode: official playback should use the IFrame Player API, while hidden/background/raw-stream playback or obscuring/removing YouTube player functionality is outside the allowed integration model
- `VibePlayerYouTubeSource.presentation` now distinguishes official in-player `iframe` playback from `external` handoff mode; omitted presentation remains `iframe` for backward compatibility
- `createVibePlayerYouTubeWatchUrl` and `getVibePlayerYouTubePresentation` live in `src/core/vibe-player-youtube.ts` and are exported for host DX
- `createYouTubeExternalAdapter` lives in `src/adapters/create-youtube-external-adapter.ts`; it renders a package-owned YouTube handoff link/card, mounts no iframe/video, exposes no fake playback capabilities, and keeps adapter commands inert
- `VibePlayerCapabilities.supportsPlayback` now lets package UI hide bottom playback chrome for non-playable handoff surfaces without branching on provider internals
- YouTube iframe runtime now passes `origin` into `playerVars` by default from the current browser origin and allows source-level `origin` / `widgetReferrer` overrides for wrapper or WebView integrations
- no package source import currently references Discover, `apps/web`, Next.js routing, app telemetry, browser storage, or app aliases

Spreadoo integration snapshot verified in `/Users/tomrobak/_projects_/spreadoo` on 2026-06-09 00:37 CEST:

- `apps/web` depends on `@vibe-code/vibe-player` through a local `file:../../../vibe-player` dependency for the current private integration pass
- `apps/web/next.config.ts` transpiles `@vibe-code/vibe-player`
- `apps/web/src/app/layout.tsx` imports `@vibe-code/vibe-player/styles.css` as global package CSS
- `apps/web/src/features/discover/discover-vibe-player-source.ts` maps `DiscoverVideo` to package `VibePlayerSource` without importing package internals into the package
- `apps/web/src/features/discover/discover-vibe-player-resume.ts` adapts existing Discover resume memory to `VibePlayerResumeStore`
- `apps/web/src/features/discover/discover-video-player.tsx` is now a thin wrapper around `VibePlayerStage`
- `apps/web/src/features/discover/use-discover-playback-telemetry.ts` maps package analytics events back into Discover-owned telemetry
- `apps/web/src/features/discover/discover-player-overlay.tsx` still owns dialog shell, rail, navigation, close behavior, and route choreography
- live browser QA on the user-managed `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1` confirms the package stage now mounts a real full-video element and close cleanup removes it, leaving only the muted background loop
- browser automation still cannot prove audible autoplay because user activation differs from a human click, but the full-video element reaches `readyState=4` with the correct `1449.834s` duration and no duplicate stage video remains after close
- standalone Vite demo now exists in `demo/vite` and uses the package through source aliases, not a Discover mimic
- `demo/vite` is the canonical local package demo for direct file, HLS, and YouTube provider surfaces
- `README.md` and `docs/integration.md` now document the muted-autoplay contract: `autoPlay` starts through muted bootstrap by default, successful bootstrap playback stays muted, and audible playback must be verified through a real user gesture on the target origin
- `package.json` has `demo:vite`, `demo:vite:check`, `demo:vite:build`, `demo:vite:packaged`, and `demo:vite:packaged:build` scripts wired to Vite `8.0.16` with `@vitejs/plugin-react` `6.0.2`; dev demo scripts bind to `localhost` for the user-facing test URL
- `demo/vite/tsconfig.json` maps `@vibe-code/vibe-player` and `@vibe-code/vibe-player/styles.css` to source files for source-mode typecheck, so `bun run demo:vite:check` does not depend on a freshly built `dist`
- Browser QA on `http://localhost:5173/?qa=full-demo-ready` confirms the standalone demo opens on the exact `localhost` origin with no browser console warnings/errors
- Browser QA on `http://localhost:5173/?qa=full-demo-0648` confirms File muted autoplay renders a real MP4 frame, HLS renders one managed `blob:` video with quality options and successful `720p` selection, and YouTube renders one `enablejsapi=1` iframe with package controls and an automation-only `playblocked` state instead of a stale loading state
- mobile Browser QA at `390x844` confirms the standalone demo renders without horizontal overflow and keeps the source rail, player shell, analytics panel, and active File video visible
- Browser QA on `http://localhost:5173/?qa=final-demo-check` now confirms the standalone demo still loads File with one muted playing MP4, HLS with one muted managed `blob:` stream and successful `level:3` quality selection, and YouTube with one iframe plus correct `Live state vite-demo-youtube` source identity in the demo analytics panel
- Browser QA on `http://localhost:5174/?qa=youtube-headless-fresh` confirms the Vite demo `YT Headless` source renders `presentation: "external"` with one package-owned handoff link, zero iframes, zero videos, no Play button, no timeline, and the expected `https://www.youtube.com/watch?v=M7lc1UVf-VE&t=2s` handoff URL
- Browser QA on the same Vite demo confirms the original YouTube source still renders exactly one official iframe, includes `origin=http://localhost:5174`, and keeps package playback controls visible
- mobile Browser QA at `390x844` confirms the `YT Headless` external handoff has no horizontal overflow, keeps the CTA visible, and still mounts zero iframes
- Spreadoo local `file:` dependency cache was refreshed with `bun install --force`, then the `web` dev server on `localhost:3001` was restarted so Turbopack stopped serving the stale missing-CSS transform
- Browser QA on `http://localhost:3001/discover/jeff-weinstein?youtubeExternalCacheCheck=3` confirms the first consumer loads without the new CSS import error, opens the package full-video dialog, plays one muted full-player video at `readyState=4`, pauses the background video while the dialog is open, and cleans up back to one background video after `Escape`
- YouTube iframe API loading now has a watchdog/polling path and the YouTube adapter has a player-creation timeout, so provider startup cannot leave the package stuck forever on a pending promise
- YouTube adapter failed-load and unmount cleanup now return snapshot/capabilities to idle and remove stale mount elements, so failed provider startup cannot leave an active-looking package surface behind
- YouTube adapter now keeps a playback-start watchdog after package `play()` intent, including stuck `paused`/`buffering` iframe states, and emits normalized `playblocked` when the provider does not reach stable playback
- YouTube adapter tests now use internal `src/adapters/youtube-adapter-test-helpers.ts`, dropping the adapter test file from the hard 280 LOC edge to 171 LOC while keeping watchdog and runtime coverage intact
- YouTube playback-start watchdog logic now lives in internal `src/adapters/youtube-playback-watchdog.ts` and completes once playback time actually advances, so later ordinary buffering does not produce a false `playblocked`
- YouTube playback-start watchdog no longer treats provider `playing` alone as success; it requires real time advancement before cancelling the blocked-start timer
- YouTube adapter checks playback time advancement on every provider state change, so quick `paused` or `buffering` events after real progress do not leave a stale blocked-start timer behind
- YouTube adapter state-change normalization and sampled timeupdate lifecycle are now split into internal helpers, keeping `create-youtube-adapter.ts` focused on lifecycle, commands, and provider mounting at 228 LOC
- public declaration surface drift is now guarded by `scripts/assert-public-surface.mjs` and the `package:surface` script, which runs inside `bun run ci` after the package build
- repo coding-rule drift is now guarded by `scripts/assert-coding-rules.mjs` and the `package:rules` script, which runs inside `bun run ci` before TypeScript and tests
- package boundary drift is now guarded by `scripts/assert-package-boundaries.mjs` and the `package:boundaries` script, which runs inside `bun run ci` before TypeScript and tests
- package dependency drift is now guarded by `scripts/assert-package-dependencies.mjs` and the `package:dependencies` script, which runs inside `bun run ci` before TypeScript and tests
- package archive drift is now guarded by `scripts/assert-package-tarball.mjs` and the `package:tarball` script, which runs inside `bun run ci` after the package surface check and before publint/ATTW
- controller load failures now surface as an `error` state, and `VibePlayerStageStatus` renders `Playback unavailable` instead of silently swallowing failed provider startup
- YouTube `unstarted` state now maps to `ready` once the iframe player handle exists, so an embedded iframe can be visible without a stale package `Loading` overlay
- `useVibePlayerMediaTarget` mounts the adapter only when the media target changes, avoiding repeated adapter remounts during state renders
- `VibePlayerStage` keeps package chrome visible for YouTube sources because pointer events over cross-origin iframes cannot reliably re-trigger parent stage idle chrome
- Browser QA on `http://localhost:5174/` confirms the package YouTube Play button stays clickable above the iframe and shows the package-owned `Play to start` state when YouTube does not start playback under automation

### Reference source root

The original behavior reference is not inside this repo. It lives in:

`/Users/tomrobak/_projects_/spreadoo/apps/web/src/features/discover`

Use those files as read-only reference input. Do not copy app coupling into the package.

### Reference map: what comes from where

Shell, modal feel, and chrome:

- `discover-video-player.tsx`: primary reference for player shell composition, native video behavior, modal surface, close affordance, chrome layout, and how playback state reaches the UI
- `discover-player-overlay.tsx`: cinematic overlay composition, top/bottom chrome placement, decorative layers, and player-level visual density
- `discover-persistent-chrome.tsx`: persistent page/player chrome behavior that may inform package chrome rules but must not become a hard package dependency
- `discover-chrome-visibility.tsx`: chrome visibility rules that should be checked before implementing package-owned idle and focus behavior

Motion and transition behavior:

- `discover-ui-motion.ts`: source of timing, easing, and reduced-motion constants to freeze before implementing package motion tokens
- `use-discover-overlay-presence.ts`: modal/overlay presence and exit timing reference
- `discover-view-transition-styles.tsx`: route/page transition styling reference; useful for integration later, not package core
- `discover-route-transition.ts`: route choreography reference; keep in Discover during integration
- `discover-rail-motion.ts` and `use-discover-thumbnail-rail-motion.ts`: rail-specific motion reference; do not move into the package except as visual QA context

Playback state and controller behavior:

- `use-discover-video-player-state.ts`: native-video state orchestration reference for play, pause, seek, mute, volume, rate, duration, and ended behavior
- `discover-player-events.ts`: playback event and progress milestone reference
- `discover-player-time.ts`: time formatting and duration truth reference
- `discover-playback-rate.ts`: allowed playback-rate behavior reference
- `use-discover-video-resume.ts`: resume behavior reference; package equivalent should stay behind `VibePlayerResumeStore`
- `discover-progress-store.ts`, `use-discover-progress.ts`: host persistence/progress references only; do not move these implementation details into package core

Controls, timeline, keyboard, and accessibility:

- `discover-video-controls.tsx`: controls layout, button density, labels, disabled states, and capability-sensitive UI reference
- `discover-seek-control.tsx`: timeline, hover, seek, buffered/progress treatment, and pointer interaction reference
- `discover-player-shortcuts.ts`: pure keyboard shortcut mapping reference
- `use-discover-player-shortcuts.ts`: React shortcut binding reference
- `discover-player-keyboard.ts`: lower-level keyboard behavior reference
- `use-discover-player-chrome.ts`: idle chrome timeout, pointer activity, focus interaction, and reveal/hide rules

Captions:

- `use-discover-video-captions.ts`: current custom-caption loading, parsing, active cue, and native text-track disabling reference
- `discover-caption-overlay.tsx`: visual caption chip/overlay reference
- `discover-caption-overlay.test.tsx` and `use-discover-video-captions.test.ts`: behavior checks to translate into package tests

Ambient/background preview:

- `discover-background-video.tsx`: ambient muted loop, poster fallback, crossfade, and reduced-motion reference
- `discover-media.ts`: media asset helper/reference; use only to understand Discover inputs, not as a package model
- `discover-background-video.test.tsx` and `discover-media.test.ts`: behavior checks to translate when Phase 7 starts

Discover-only integration references:

- `discover-types.ts`: source of current app data shape; must be adapted to `VibePlayerSource`, not imported
- `discover-page-client.tsx`: page routing, rail, selected item, and modal orchestration; stays in Discover
- `discover-page-hero.tsx`, `discover-page-rail-section.tsx`, `discover-thumbnail-rail.tsx`, `discover-thumbnail-card.tsx`, `discover-rail-arrows.tsx`: page and rail composition; use only for later integration QA
- `use-discover-playback-telemetry.ts`: telemetry reference; package should emit normalized events and let Discover own telemetry
- `discover-watched-toggle.tsx`: Discover watched-state UI; not a package concern

### Reference tests to mine

These tests are useful as behavior contracts or parity smoke tests:

- `discover-video-player.test.tsx`
- `discover-video-controls.mocked.test.tsx`
- `discover-seek-control.test.tsx`
- `discover-player-keyboard.test.ts`
- `discover-player-shortcuts.test.ts`
- `discover-player-events.test.ts`
- `discover-player-time.test.ts`
- `discover-playback-rate.test.ts`
- `use-discover-player-chrome.mocked.test.tsx`
- `use-discover-overlay-presence.mocked.test.tsx`
- `discover-caption-overlay.test.tsx`
- `use-discover-video-captions.test.ts`
- `discover-background-video.test.tsx`
- `discover-media.test.ts`

### What is already strong in Discover

These parts are already good enough to treat as reference behavior:

- player shell and chrome behavior in `apps/web/src/features/discover/discover-video-player.tsx`
- playback state orchestration in `apps/web/src/features/discover/use-discover-video-player-state.ts`
- controls UI in `apps/web/src/features/discover/discover-video-controls.tsx`
- seek UX in `apps/web/src/features/discover/discover-seek-control.tsx`
- keyboard handling in `apps/web/src/features/discover/discover-player-shortcuts.ts` and `use-discover-player-shortcuts.ts`
- idle chrome logic in `apps/web/src/features/discover/use-discover-player-chrome.ts`
- overlay presence/exit timing in `apps/web/src/features/discover/use-discover-overlay-presence.ts`
- custom caption parsing/rendering in `apps/web/src/features/discover/use-discover-video-captions.ts`
- cinematic overlay composition in `apps/web/src/features/discover/discover-player-overlay.tsx`
- ambient background-video crossfade behavior in `apps/web/src/features/discover/discover-background-video.tsx`

### What is too Discover-coupled to extract directly

These parts must not define the new package architecture:

- Discover-specific data shape in `apps/web/src/features/discover/discover-types.ts`
- Discover-only public asset assumptions: `backgroundLoop`, `fullVideo`, `poster`, `ogImage`
- Discover page routing and prev/next rail logic in `discover-page-client.tsx`
- Discover telemetry in `use-discover-playback-telemetry.ts`
- Discover watched/progress state and local route behavior
- Discover-specific copy like `Watch on YouTube`
- Discover-specific overlay content such as rail arrows and thumbnail rail

### The most important architectural limitation today

The current player is fundamentally built around a native `HTMLVideoElement`.

That is visible in:

- direct `videoRef.current.play()` / `pause()` / `currentTime` / `muted` / `playbackRate`
- direct `textTracks` control
- direct `<video src={video.assets.fullVideo.url}>`
- direct `onTimeUpdate`, `onLoadedMetadata`, `onEnded`, `onVolumeChange`

This means the current implementation is a strong **behavior and UI reference**, but not yet a provider-agnostic player core.

## What We Are Actually Building

We are not building “the Discover player extracted”.

We are building a **video platform package with a first-class cinematic skin** whose initial visual benchmark is the Discover player.

The package should provide:

- a headless player core
- a provider adapter system
- reusable React UI primitives
- one polished default skin
- one Discovery-parity skin or preset
- modal and inline assembly helpers
- ambient background-preview helpers

## Package Positioning

### Recommended package name

`@vibe-code/vibe-player`

This name is good if the intention is:

- cinematic
- branded
- reusable across marketing, education, onboarding, support, demos, internal tools

If later the package becomes more general-purpose and less “brand surface” oriented, a rename to `media-player` can still happen. For now `vibe-player` matches the intention.

### Why standalone repo is acceptable now

- the repo already exists at `/Users/tomrobak/_projects_/vibe-player`
- the package can stay provider-agnostic without accidental app imports
- Discovery remains a reference and future consumer, not the architectural owner
- reference code can still be read directly from `/Users/tomrobak/_projects_/spreadoo/apps/web/src/features/discover`
- integration can happen later through an adapter layer in Spreadoo

### When a separate repo becomes justified

The separate repo already exists. A later public/open-source release is justified only after all of these are true:

- at least 2 real consumers beyond Discovery
- provider contract is stable
- skin/theming contract is stable
- no internal app import aliases leak into the package
- release/versioning policy is clear

Until then, keep the repo private and package-quality, but avoid public API churn promises.

## Core Architectural Decision

The package must be split into **headless playback orchestration** and **visual skin/rendering**.

That split is mandatory for YouTube/HLS support.

### Layer model

1. **Core**
   - player session state
   - provider lifecycle
   - playback commands
   - time/progress state
   - capability flags
   - events

2. **Provider adapters**
   - file adapter
   - HLS adapter
   - YouTube adapter

3. **UI primitives**
   - controls
   - timeline
   - caption overlay
   - chrome shell
   - modal shell
   - background-preview shell

4. **Skins/presets**
   - default cinematic skin
   - Discovery-parity skin

5. **Host integration seams**
   - persistence
   - analytics
   - localization/copy
   - fullscreen/PiP policy

## Source Model

The new package must stop treating “video” as one direct file URL.

### Recommended source union

```ts
interface VibePlayerFileSource {
  type: "file";
  id: string;
  posterUrl?: string | null;
  captions?: VibePlayerCaptionTrack[];
  sources: VibePlayerMediaSource[];
  title?: string;
}

interface VibePlayerHlsSource {
  type: "hls";
  id: string;
  manifestUrl: string;
  posterUrl?: string | null;
  captions?: VibePlayerCaptionTrack[];
  title?: string;
  live?: boolean;
}

interface VibePlayerYouTubeSource {
  type: "youtube";
  id: string;
  youtubeVideoId: string;
  posterUrl?: string | null;
  title?: string;
  startSeconds?: number;
}

interface VibePlayerMediaSource {
  mimeType: string;
  url: string;
}

interface VibePlayerCaptionTrack {
  id: string;
  kind: "captions" | "subtitles";
  label: string;
  language: string;
  url: string;
  default?: boolean;
}

type VibePlayerSource =
  | VibePlayerFileSource
  | VibePlayerHlsSource
  | VibePlayerYouTubeSource;
```

### Why this matters

- direct file playback stays simple
- HLS gets its own proper manifest concept
- YouTube gets a canonical identity instead of a raw outbound URL
- captions become explicit and reusable
- the package can render provider-aware UI from a stable model

## Provider Adapter Contract

This is the most important part of the whole package.

The UI must talk to a **normalized runtime adapter**, not to DOM video directly.

### Recommended runtime contract

```ts
interface VibePlayerCapabilities {
  canFullscreen: boolean;
  canPictureInPicture: boolean;
  canSetPlaybackRate: boolean;
  canSeek: boolean;
  canShowCaptions: boolean;
  hasNativeCaptionsMenu: boolean;
  supportsVolumeControl: boolean;
  supportsMute: boolean;
  supportsPoster: boolean;
  supportsQualitySelection: boolean;
  supportsDuration: boolean;
  isLive: boolean;
}

interface VibePlayerSnapshot {
  currentTime: number;
  duration: number;
  muted: boolean;
  paused: boolean;
  playbackRate: number;
  volume: number;
  bufferedPct?: number;
  readyState: "idle" | "loading" | "ready" | "playing" | "ended" | "error";
}

interface VibePlayerAdapter {
  readonly kind: VibePlayerSource["type"];
  readonly capabilities: VibePlayerCapabilities;
  mount(target: HTMLElement): Promise<void>;
  unmount(): Promise<void>;
  load(source: VibePlayerSource): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  setMuted(value: boolean): Promise<void>;
  setPlaybackRate(value: number): Promise<void>;
  setVolume(value: number): Promise<void>;
  enterFullscreen?(): Promise<void>;
  exitFullscreen?(): Promise<void>;
  enterPictureInPicture?(): Promise<void>;
  getSnapshot(): VibePlayerSnapshot;
  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void;
}
```

### Required event normalization

At minimum:

- `ready`
- `play`
- `pause`
- `timeupdate`
- `durationchange`
- `ended`
- `volumechange`
- `ratechange`
- `captionschange`
- `fullscreenchange`
- `error`

### Critical rule

The UI layer must never branch on provider DOM internals. It can branch only on:

- normalized source type
- normalized capabilities
- normalized events

## Motion and Transition System

This is a hard-requirement section because motion quality is one of the reasons to build the package at all.

### Discovery behavior that must be preserved

- modal open/close presence behavior
- shell entrance and exit easing
- idle chrome fade/hide
- top chrome moving upward and bottom chrome moving downward
- pointer-through decorative layers
- cinematic backdrop treatment
- reduced-motion-safe fallback behavior
- timeline hover feedback
- background-preview crossfade behavior

### Frozen Discovery reference values

Verified from `/Users/tomrobak/_projects_/spreadoo/apps/web/src/features/discover` on 2026-06-08 21:16 CEST.

General hover motion from `discover-ui-motion.ts`:

- text hover: `color 200ms ease`
- surface hover: `background-color`, `border-color`, and `color` at `200ms ease`
- action hover: `background-color` and `transform` at `200ms cubic-bezier(.23, 1, .32, 1)`
- media hover: `opacity` and `transform` at `220ms cubic-bezier(.23, 1, .32, 1)`
- hover motion disables transitions for coarse pointer, no-hover, and reduced-motion contexts
- dark focus ring: white ring at 65% opacity with black offset

Modal and shell presence from `use-discover-overlay-presence.ts` and `discover-player-overlay.tsx`:

- overlay exit retention: `180ms`
- overlay in: `180ms cubic-bezier(.23,1,.32,1)`, opacity `0 -> 1`
- overlay out: `180ms cubic-bezier(.215,.61,.355,1)`, opacity `1 -> 0`
- backdrop in: `220ms cubic-bezier(.23,1,.32,1)`, opacity `0 -> 0.7`, scale `1.04 -> 1.06`
- backdrop out: `180ms cubic-bezier(.215,.61,.355,1)`, opacity `0.7 -> 0`, scale `1.06 -> 1.04`
- shell in: `220ms cubic-bezier(.23,1,.32,1)`, opacity `0 -> 1`, transform `translate3d(0, 10px, 0) scale(.985) -> translate3d(0, 0, 0) scale(1)`
- shell out: `180ms cubic-bezier(.215,.61,.355,1)`, opacity `1 -> 0`, transform `translate3d(0, 0, 0) scale(1) -> translate3d(0, 8px, 0) scale(.99)`
- reduced motion disables overlay, backdrop, and shell animations and clears transform

Player shell geometry and backdrop from `discover-player-overlay.tsx`:

- modal root background: `#050506`
- backdrop image: scale `1.06`, opacity `0.7`, blur `18px`
- overlay wash layers: `bg-black/34` plus vertical gradient from black/58 through black/10 to black/42
- shell width: `min(92vw, calc((100svh - 9rem) * 1.777), 1760px)`
- shell frame: aspect-video, `rounded-lg`, border `#858cff` at 45% opacity, background black/45
- shell shadow: `0 28px 120px rgba(0,0,0,0.72)` plus `0 0 0 1px rgba(255,255,255,0.06)`
- outside pointer down on the centered overlay closes the player

Idle chrome and controls from `use-discover-player-chrome.ts`, `discover-video-player.tsx`, and `discover-video-controls.tsx`:

- chrome idle delay: `2400ms`
- top/bottom chrome transition: opacity and transform `240ms cubic-bezier(.23,1,.32,1)`
- top chrome hides with `-translate-y-2`, bottom chrome hides with `translate-y-2`
- hidden chrome becomes `pointer-events-none`, `aria-hidden`, and inert
- bottom scrim transition: opacity `220ms cubic-bezier(.23,1,.32,1)`
- rail overlay transition: opacity and transform `260ms cubic-bezier(.23,1,.32,1)`
- opening overlay hides rail chrome on the next animation frame
- pointer move, pointer down, focus on root, and Tab reveal chrome
- focus within controls holds chrome visible; blur outside releases it

Seek/timeline behavior from `discover-seek-control.tsx`:

- seek hit area: height `2rem`; visual rail height `2px`; focus halo height `12px`
- progress is clamped to `0..100`
- hover tooltip horizontal position is clamped to `6..94%`
- range step is `0.1` seconds
- hover ghost point size is `0.5rem`; current point size is `0.375rem`
- focus and tooltip transitions use `150ms cubic-bezier(.23,1,.32,1)`
- disabled/no-duration timeline renders but seek input is disabled and progress is `0`

Caption overlay from `discover-caption-overlay.tsx`:

- overlay is pointer-through and `aria-live="polite"`
- bottom offset: `5.75rem`, `6.5rem` on small screens and up
- max caption chip width: `min(82%, 48rem)`
- chip radius: `3px`
- chip background: black at 58% opacity
- text: 14px, white at 90% opacity, centered, snug line height; 15px on small screens and up
- chip shadow: `0 10px 24px rgba(0,0,0,0.26)`
- backdrop blur: small

Keyboard and rate behavior from `discover-player-shortcuts.ts`, `discover-player-keyboard.ts`, and `discover-playback-rate.ts`:

- ignored shortcut targets: `a`, `button`, `input`, `select`, `textarea`, and contenteditable
- modifiers disable shortcuts
- play toggle: Space, literal space key, or `k`
- mute toggle: `m`
- seek backward/forward: ArrowLeft and ArrowRight
- fullscreen: `f`
- captions toggle: `c` only when captions are available
- Tab reveals hidden chrome
- playback rates: `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`, cycling back to `1` for unknown values

Ambient background preview from `discover-background-video.tsx`:

- background layer transition: opacity and transform `260ms cubic-bezier(.645,.045,.355,1)`
- visible layer: `scale(1.006)` and opacity `1`
- hidden layer: `scale(1.012)` and opacity `0`
- retire delay after active layer reveal: `300ms`
- frame-ready fallback timeout: `2500ms`
- layer keeps at most two entries and de-duplicates by `src|posterUrl`
- previous layer can seed soft transitions when `document.documentElement.dataset.discoverSoftTransition === "true"`
- muted background video pauses for reduced motion and resumes only when intersecting

### V1 scope cut

V1 should ship in this order:

1. Phase 2 native file adapter with direct MP4/WebM playback, normalized events, poster, mute, volume, playback rate, seek, duration, fullscreen capability, resume restore, and custom WebVTT caption support.
2. Phase 3 package-owned cinematic UI for inline and modal surfaces using the frozen motion values above, without Discover rail, routing, telemetry, watched state, or app data types.
3. Phase 4 Discovery-parity skin/tokens that preserve shell geometry, chrome movement, caption chip, timeline, and modal presence.

The initial V1 baseline intentionally stopped before HLS, YouTube, ambient preview, PiP, quality selection, public release, and Discover integration. HLS and YouTube are now implemented as later package phases after the core contract proved stable; ambient preview, PiP, quality selection, public release, and Discover integration remain later work.

### Motion architecture rule

Motion must not be hardcoded ad hoc across many components.

We should define a small shared motion contract, for example:

- `--vibe-ease-standard`
- `--vibe-ease-emphasized`
- `--vibe-duration-fast`
- `--vibe-duration-medium`
- `--vibe-duration-slow`
- `--vibe-player-chrome-hide-delay`

And a small TS helper layer for behavior constants:

- modal exit ms
- chrome idle timeout ms
- background layer retire delay ms
- seek-hover easing

### Discovery-parity preset

The package should ship a specific preset or skin that intentionally matches current Discovery behavior:

- shell sizing
- backdrop blur and opacity
- top/bottom chrome transitions
- border and shadow recipe
- caption chip styling
- timeline styling
- control spacing

This is the safest way to preserve the exact feel while still making the package reusable.

### Important separation

Do not mix:

- provider runtime logic
- motion timing constants
- brand visual tokens

Those must remain separate so the same HLS/YouTube runtime can power multiple skins.

## UI Surface Model

The package should not ship as one giant all-or-nothing component.

### Recommended exports

#### High-level assemblies

- `VibePlayerInline`
- `VibePlayerModal`
- `VibeBackgroundPreview`

#### Mid-level shells

- `VibePlayerShell`
- `VibePlayerChrome`
- `VibePlayerControls`
- `VibePlayerTimeline`
- `VibePlayerCaptionOverlay`
- `VibePlayerBackdrop`

#### Headless hooks/controllers

- `useVibePlayerController`
- `useVibePlayerChrome`
- `useVibePlayerShortcuts`
- `useVibePlayerResume`
- `useVibePlayerCaptions`

#### Utilities

- time formatting
- WebVTT parsing
- progress milestone helpers
- provider capability helpers

### Why this split matters

- Discovery can adopt the full modal assembly later
- another surface can use only the inline player
- another surface can reuse the controller with custom controls
- background ambient surfaces can use the preview layer without loading the full player UX

## Persistence and Analytics Seams

The package must not own product-specific persistence or telemetry.

### Resume persistence seam

Current Discover resume is an in-memory `Map`. That is not enough for a reusable package.

Instead the package should accept an optional persistence interface:

```ts
interface VibePlayerResumeStore {
  get(sourceId: string): number | null;
  set(sourceId: string, seconds: number): void;
  clear(sourceId: string): void;
}
```

Possible host implementations:

- memory only
- localStorage
- IndexedDB
- remote sync

Current package helpers:

- `createMemoryVibePlayerResumeStore` provides a normalized in-memory host store for demos, tests, and non-persistent surfaces
- `createLocalStorageVibePlayerResumeStore` provides an opt-in browser storage host store with injectable storage for tests and SSR-safe no-storage behavior
- no player assembly silently enables localStorage; persistence remains a host decision through the `resumeStore` prop/controller option

### Analytics seam

The package should emit normalized events and let hosts decide what to record.

```ts
interface VibePlayerAnalyticsEvent {
  type:
    | "opened"
    | "started"
    | "progress_25"
    | "progress_50"
    | "progress_75"
    | "completed"
    | "closed"
    | "seek"
    | "error";
  sourceId: string;
  provider: VibePlayerSource["type"];
  currentTime?: number;
  duration?: number;
}
```

The package can provide a helper milestone implementation, but the host decides where events go.

## Captions Strategy

Captions must be treated as a first-class feature, but provider-aware.

### File and HLS

For file/HLS:

- keep the custom WebVTT parsing path
- keep the custom caption overlay option
- support native track disabling when custom overlay is active

### YouTube

YouTube is different:

- we will not reliably control YouTube captions the same way as `textTracks`
- v1 should treat YouTube captions as a provider capability with limited UI guarantees
- if YouTube caption state cannot be normalized cleanly, the package should hide custom caption controls for YouTube instead of pretending parity

### Rule

Do not fake feature parity across providers.

The UI should render only what the adapter says it actually supports.

## Fullscreen, PiP, and Provider Truth

The package must degrade honestly:

- YouTube may not support the same PiP/fullscreen behavior as native file playback
- HLS live streams may not expose useful duration/seek semantics
- autoplay and mute policies vary by environment

So:

- fullscreen button appears only when supported
- PiP button is optional and not required in v1
- playback speed appears only when supported
- caption button appears only when supported
- timeline can switch to a disabled/live state

## Ambient Background Preview

This is important because Discovery uses background media as part of the experience, not just the player.

The package should eventually support a reusable ambient preview layer.

### What that means

- muted looping background media
- poster fallback
- reduced-motion fallback
- multi-layer crossfade between previous and next background state
- no dependency on the full-player modal

### Recommendation

Treat this as part of the package roadmap, but not as the first shipping requirement for v1 player extraction.

Reason:

- it is valuable
- it is visually important for Discovery
- but it should not block the core reusable player contract

## Package File Structure

The current repo is standalone, so this structure lives at the repository root.
If the package is ever moved back into a monorepo, the same structure maps to
`packages/vibe-player`.

```text
package.json
tsconfig.json
src/
  index.ts
  core/
    vibe-player-types.ts
    vibe-player-controller.ts
    vibe-player-events.ts
    vibe-player-capabilities.ts
    vibe-player-resume.ts
    vibe-player-shortcuts.ts
    vibe-player-time.ts
  adapters/
    create-file-adapter.ts
    create-hls-adapter.ts
    create-youtube-adapter.ts
    adapter-types.ts
  react/
    use-vibe-player-controller.ts
    use-vibe-player-chrome.ts
    use-vibe-player-shortcuts.ts
    use-vibe-player-captions.ts
    use-vibe-player-resume.ts
  ui/
    vibe-player-inline.tsx
    vibe-player-modal.tsx
    vibe-player-shell.tsx
    vibe-player-controls.tsx
    vibe-player-timeline.tsx
    vibe-player-caption-overlay.tsx
    vibe-player-backdrop.tsx
    vibe-player-empty-state.tsx
  preview/
    vibe-background-preview.tsx
    use-vibe-background-layers.ts
  skins/
    discovery/
      discovery-vibe-player-skin.ts
      discovery-vibe-player-tokens.ts
    cinematic-default/
      cinematic-default-skin.ts
  captions/
    parse-webvtt.ts
    caption-types.ts
  styles/
    vibe-player.css
    vibe-player-motion.ts
```

## Delivery Phases

This plan is meant to be execution-ready. The phases below are intentionally strict.

### Phase 0 — Truth reset and reference freeze

Status: complete.

Goal: lock the exact reference behavior before implementation starts.

Required work:

- inventory all Discover player behaviors worth preserving
- explicitly separate reusable behavior from Discover-only composition
- record current motion timings/easings and chrome behavior from code
- define the v1 scope cut

Acceptance criteria:

- package target name is chosen
- source union is ratified
- adapter contract is ratified
- Discovery-parity motion requirements are written down

Current progress:

- reference root is identified: `/Users/tomrobak/_projects_/spreadoo/apps/web/src/features/discover`
- behavior-to-file reference map is now recorded in this plan
- reusable behavior is separated from obvious Discover-only composition at the planning level
- package target name is chosen: `@vibe-code/vibe-player`
- source union and adapter contract are implemented in `src/core/vibe-player-types.ts`
- exact Discovery motion constants, chrome timing, timeline geometry, caption styling, keyboard shortcuts, playback rates, and ambient background timing are frozen in this plan
- v1 scope cut is written down

Remaining:

- none

Verification:

- 2026-06-08 21:16 CEST: inspected `discover-ui-motion.ts`, `use-discover-overlay-presence.ts`, `use-discover-player-chrome.ts`, `discover-video-player.tsx`, `discover-player-overlay.tsx`, `discover-video-controls.tsx`, `discover-seek-control.tsx`, `discover-caption-overlay.tsx`, `discover-player-shortcuts.ts`, `discover-player-keyboard.ts`, `discover-playback-rate.ts`, and `discover-background-video.tsx`
- 2026-06-08 21:17 CEST: `bun run check`
- 2026-06-08 21:17 CEST: `bun run check-types`
- 2026-06-08 21:17 CEST: `bun run test`
- 2026-06-08 21:17 CEST: `bun run build`

### Phase 1 — Headless core contract

Status: complete for the current package contract.

Goal: create the generic controller contract before any visual extraction.

Required work:

- define `VibePlayerSource`
- define `VibePlayerAdapter`
- define capabilities model
- define normalized events
- define controller state machine
- define persistence and analytics seams

Acceptance criteria:

- no Discover types leak into core
- core compiles without React UI
- controller tests cover play/pause/seek/rate/mute/progress truth

Current progress:

- `VibePlayerSource` exists in `src/core/vibe-player-types.ts`
- `VibePlayerAdapter` exists in `src/core/vibe-player-types.ts`
- capabilities model exists in `src/core/vibe-player-types.ts`
- normalized event names and adapter events exist in `src/core/vibe-player-types.ts`
- resume and analytics seams exist in `src/core/vibe-player-types.ts`
- top-level public core interfaces and unions in `src/core/vibe-player-types.ts` have concise TSDoc for generated declaration consumers
- opt-in resume store helpers exist in `src/core/vibe-player-resume-store.ts`: `createMemoryVibePlayerResumeStore` and `createLocalStorageVibePlayerResumeStore`
- controller skeleton exists in `src/core/vibe-player-controller.ts`
- progress milestone helper exists in `src/core/vibe-player-events.ts`
- time helpers exist in `src/core/vibe-player-time.ts`
- controller tests now cover mount, load, adapter swap, command forwarding, seek analytics, resume restore, progress milestones, started/completed/closed analytics, and teardown
- controller test adapter and harness setup now live in `src/core/vibe-player-controller-test-helpers.ts`, keeping `vibe-player-controller.test.ts` focused on behavior cases and comfortably below the 280 LOC hard limit
- session analytics are deduplicated through `src/core/vibe-player-analytics.ts`
- controller play and seek command details now live in internal `vibe-player-controller-commands.ts`
- controller load lifecycle details now live in internal `vibe-player-controller-load.ts`, keeping `src/core/vibe-player-controller.ts` at 209 LOC after extracting analytics, initial-state, load-error, resume-restore, command, and load helpers
- package playback surfaces still do not enable persistence by default; hosts must pass a `VibePlayerResumeStore` explicitly

Remaining:

- none for the current Phase 1 contract; Phase 2 should still wait for the Phase 0 v1 scope cut

Decision:

- normalized progress milestones belong in the controller analytics session because adapters provide normalized `currentTime` and `duration`; hosts still own the telemetry sink through `onAnalyticsEvent`

Verification:

- 2026-06-08 21:13 CEST: `bun run check`
- 2026-06-08 21:13 CEST: `bun run check-types`
- 2026-06-08 21:13 CEST: `bun run test`
- 2026-06-08 21:14 CEST: no package source imports reference Discover, `apps/web`, Next.js routing, app telemetry, browser storage, or app aliases
- 2026-06-08 21:15 CEST: `bun run check`
- 2026-06-08 21:15 CEST: `bun run check-types`
- 2026-06-08 21:15 CEST: `bun run test`
- 2026-06-08 21:15 CEST: `bun run build`
- 2026-06-09 01:05 CEST: optional resume store helpers added and exported; `bun run check`, `bun run check-types`, targeted resume/controller Vitest files, and `bun run build` passed
- 2026-06-09 02:54 CEST: public core TSDoc pass kept `src/core/vibe-player-types.ts` at 191 LOC and passed `bun run check`, `bun run check-types`, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, and `git diff --check`; generated `dist/index.d.ts` includes the new core contract comments
- 2026-06-09 02:58 CEST: controller split moved load-error and resume-restore details into internal helpers, reducing `src/core/vibe-player-controller.ts` from 279 LOC to 251 LOC; validation passed `bun run check`, `bun run check-types`, targeted controller/resume Vitest with 2 files and 10 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the new helpers are not exported in `dist/index.d.ts`
- 2026-06-09 03:14 CEST: controller test harness extraction moved `TestAdapter`, blocked-playback error setup, and harness factories into internal `vibe-player-controller-test-helpers.ts`; `vibe-player-controller.test.ts` dropped from 279 to 143 LOC, helper is 164 LOC, and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted controller/resume/file/HLS Vitest with 4 files and 26 tests, `bun run build`, `bun run demo:vite:check`, rerun `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the test helper is not exported in `dist/index.d.ts`
- 2026-06-09 06:14 CEST: controller command extraction moved blocked-playback `play()` handling and seek resume/analytics into internal `vibe-player-controller-commands.ts`; focused controller/resume Vitest passed with 2 files and 10 tests, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:20 CEST: controller load lifecycle extraction moved adapter create/mount/load/error/resume orchestration into internal `vibe-player-controller-load.ts`; `src/core/vibe-player-controller.ts` is now 209 LOC, focused controller/resume Vitest passed with 2 files and 10 tests, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`

### Phase 2 — File adapter

Status: complete for the current direct-file v1 scope.

Goal: make direct-file playback the first real adapter.

Required work:

- implement native file adapter around `HTMLVideoElement`
- normalize events
- support poster, captions, mute, rate, seek, fullscreen
- reuse current WebVTT logic where appropriate

Acceptance criteria:

- direct-file adapter reaches parity with current Discover playback behavior
- captions work with custom overlay
- controller + adapter tests are green

Current progress:

- `createFileAdapter` exists and is exported from `src/adapters/index.ts`
- adapter creates a native `<video>` element, mounts it into the adapter target, and keeps DOM playback isolated from shared UI
- adapter loads multiple file sources, poster, and caption tracks
- adapter keeps native caption tracks disabled so custom captions do not double-render with the browser's native caption renderer
- adapter exposes truthful source-aware capabilities for seek, rate, captions, poster, duration, mute, volume, and fullscreen support
- adapter normalizes native media events into `VibePlayerAdapterEvent`
- adapter implements play, pause, seek, mute, rate, volume, enter fullscreen, exit fullscreen, and unmount
- seek clamps to finite duration and volume clamps to `0..1`
- adapter uses the shared native playback helper for guarded `play()`, command forwarding, stale resolution guards, volume clamping, fullscreen, Picture-in-Picture, and unmount media cleanup
- adapter resets source/video references on unmount so snapshot and capabilities return to idle after teardown
- adapter uses the shared internal adapter listener contract instead of a local listener alias
- adapter rejects unsupported source types and empty file sources through rejected promises
- adapter tests cover DOM output, capabilities, event normalization, command forwarding, seek/volume clamping, fullscreen support, and error cases
- `create-file-adapter.test.ts` is now 147 LOC after moving file fixtures, unsupported-source fixtures, single-source creation, load mocking, and loaded-adapter harness setup into `file-adapter-test-helpers.ts`
- WebVTT parsing exists in `src/captions/parse-webvtt.ts`
- `useVibePlayerCaptions` loads the default caption track, parses WebVTT, exposes active lines by current time, and reports loader errors without throwing during render
- `VibePlayerCaptionOverlay` renders the custom pointer-through `aria-live` caption chip using frozen Discover caption geometry and styling
- `VibePlayerInline` connects the file adapter, controller, controls, captions, chrome, and shortcuts for the first package-owned direct-file player surface

Remaining:

- none for the current direct-file v1 scope
- HLS and YouTube adapter work remains in later phases

Verification:

- 2026-06-08 21:24 CEST: `bun run check`
- 2026-06-08 21:24 CEST: `bun run check-types`
- 2026-06-08 21:24 CEST: `bun run test`
- 2026-06-08 21:24 CEST: `bun run build`
- 2026-06-08 21:27 CEST: `bun run check`
- 2026-06-08 21:27 CEST: `bun run check-types`
- 2026-06-08 21:27 CEST: `bun run test`
- 2026-06-08 21:27 CEST: `bun run build`
- 2026-06-08 21:42 CEST: `bun run check`
- 2026-06-08 21:42 CEST: `bun run check-types`
- 2026-06-08 21:42 CEST: `bun run test`
- 2026-06-08 21:42 CEST: `bun run build`
- 2026-06-08 22:05 CEST: `bun run check`
- 2026-06-08 22:05 CEST: `bun run check-types`
- 2026-06-08 22:05 CEST: `bun run test`
- 2026-06-08 22:05 CEST: `bun run build`
- 2026-06-08 22:05 CEST: Browser runtime QA at `http://127.0.0.1:4177/demo/phase3-runtime.html`; direct MP4 loaded, muted playback advanced past `1s`, custom WebVTT caption rendered once, and native `TextTrack` mode was `disabled`
- 2026-06-08 22:07 CEST: final `bun run check`, `bun run check-types`, `bun run test`, `bun run build`, and `git diff --check`
- 2026-06-09 03:08 CEST: native playback helper extraction moved stale `play()` guards, volume clamp, and unmount media cleanup into internal `native-video-playback.ts`; validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted file/HLS/PiP Vitest with 4 files and 23 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the helper is not exported in `dist/index.d.ts`
- 2026-06-09 03:11 CEST: native adapter test helper extraction moved mounted-video lookup, deferred playback, and mocked media-property setup into `native-video-test-helpers.ts`; `create-file-adapter.test.ts` dropped from 280 to 246 LOC and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted file/HLS/PiP Vitest with 4 files and 23 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the helper is not exported in `dist/index.d.ts`
- 2026-06-09 03:29 CEST: shared adapter listener extraction moved the file/HLS/YouTube adapter listener signature into internal `adapter-listener.ts`; targeted adapter Vitest passed with 5 files and 29 tests, and full validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that `VibePlayerAdapterListener` is not exported in `dist/index.d.ts`
- 2026-06-09 03:33 CEST: guarded native play extraction moved the duplicated file/HLS `video.play()` stale-resolution pause logic into internal `playGuardedNativeVideo`; `create-file-adapter.ts` dropped to 189 LOC and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted file/HLS/PiP Vitest with 4 files and 23 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, empty rules grep for `any`/`.forEach()`/`enum`/non-null assertions, and exact-symbol proof that `playGuardedNativeVideo` and `PlayGuardedNativeVideoInput` are not exported in `dist/index.d.ts`
- 2026-06-09 05:48 CEST: native file adapter cleanup hardening now resets source/video state on unmount and returns idle snapshot/capabilities after teardown; targeted file/HLS/PiP Vitest passed with 4 files and 23 tests
- 2026-06-09 06:08 CEST: shared native command extraction moved file/HLS pause, play, seek, mute, rate, volume, fullscreen, and Picture-in-Picture command logic into internal `native-video-playback.ts`; `create-file-adapter.ts` is now 173 LOC, focused file/HLS/PiP Vitest passed with 4 files and 23 tests, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:14 CEST: file adapter source fixture moved into internal `file-adapter-test-helpers.ts`, reducing `create-file-adapter.test.ts` to 223 LOC while preserving focused file/HLS/PiP coverage and full package validation
- 2026-06-09 07:01 CEST: file adapter test harness extraction reduced `create-file-adapter.test.ts` from 223 LOC to 147 LOC and expanded `file-adapter-test-helpers.ts` to own loaded-adapter setup, single-file source creation, empty file fixture, unsupported HLS fixture, and native `load()` mocking; focused file/PiP Vitest passed with 2 files and 13 tests, `bun run package:rules` passed, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`

Reference inputs:

- `use-discover-video-player-state.ts`
- `discover-video-player.tsx`
- `use-discover-video-captions.ts`
- `discover-player-events.ts`
- `discover-player-time.ts`
- `discover-playback-rate.ts`

### Phase 3 — First cinematic UI skin

Status: complete for the current cinematic direct-file v1 scope.

Goal: ship a generic polished UI without Discovery coupling.

Required work:

- build modal shell
- build controls
- build timeline
- build caption overlay
- build idle chrome logic
- build keyboard shortcut integration
- add reduced-motion support

Acceptance criteria:

- the package ships one visually strong skin
- no telemetry/router/watched/rail assumptions exist
- pointer-through and focus semantics match current quality bar

Current progress:

- `VibePlayerInline`, `VibePlayerModal`, `VibePlayerShell`, and shared `VibePlayerStage` components exist in `src/ui`
- `VibePlayerCaptionOverlay` exists with Discover-parity caption chip geometry, pointer-through behavior, and `aria-live`
- `VibePlayerControls` exists with capability-aware play, mute, seek, playback-rate, captions, fullscreen, close, title, top chrome, bottom chrome, and scrim rendering
- `VibePlayerControls` now uses internal icon-only command buttons with preserved `aria-label` and hover `title` names for play, pause, mute, captions, fullscreen, close, and Picture-in-Picture instead of text glyphs
- bottom chrome command buttons now live in internal `vibe-player-bottom-control-buttons.tsx`, reducing `vibe-player-bottom-controls.tsx` from 234 LOC to 100 LOC while keeping the extracted helper at 179 LOC
- `VibePlayerTimeline` exists with clamped progress, disabled no-duration state, range input, focus halo, current point, hover ghost point, and tooltip behavior
- `getVibePlayerShortcutAction` and `useVibePlayerShortcuts` exist for provider-capability-aware keyboard handling
- `useVibePlayerChrome` exists with Discover-parity `2400ms` idle delay, show/hold/release/schedule actions, close reset, and timer cleanup
- playback-rate helpers exist with Discover-parity rates: `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`
- controls/timeline styles use the frozen 240ms chrome, 220ms scrim, 150ms timeline, focus ring, and reduced-motion behavior
- `package.json` publishes `src/styles/*.css` so the main stylesheet can import the split controls stylesheet safely
- `VibePlayerInline` is now the first direct-file assembly: it loads the source, mounts the adapter target, wires controls, captions, chrome, shortcuts, and controller commands
- shared `VibePlayerStage` owns reusable player runtime, controls, captions, chrome, shortcuts, and controller command wiring
- `VibePlayerStageProps` now lives in `src/ui/vibe-player-stage-types.ts` with public TSDoc, keeping the runtime component focused and reducing `src/ui/vibe-player-stage.tsx` from 267 LOC to 241 LOC
- `useVibePlayerStageActions` now owns shared stage command, control, and shortcut action wiring, reducing `src/ui/vibe-player-stage.tsx` to 192 LOC while keeping the hook at 116 LOC
- `VibePlayerStage` test adapter and factory setup now live in `src/ui/vibe-player-stage-test-helpers.ts`, keeping `vibe-player-stage.test.tsx` focused on behavior cases and below the hard LOC limit
- `useVibePlayerOverlayPresence` keeps modal DOM rendered through the frozen `180ms` close transition
- `VibePlayerModal` supports source-backed playback, poster backdrop imagery, wash/gradient layers, outside-click close, closing state, and the shared player stage
- modal/backdrop styles use frozen overlay/backdrop/shell timing, backdrop blur/scale/opacity, shell geometry, reduced-motion behavior, and 8px shell radius
- controls CSS, timeline CSS, modal CSS, and main package CSS are split across files below the hard 280 LOC limit
- shell, stage, and bottom chrome responsive CSS prevent mobile min-content overflow while preserving the desktop cinematic layout
- `demo/phase3-runtime.html` imports the built package and package CSS for browser runtime QA of inline and modal surfaces
- Browser runtime QA verified desktop inline playback, modal open/close, custom captions, analytics events, and mobile layout
- no intentional Discovery visual deviation is documented for Phase 3 beyond the already-scoped exclusions: no rail, watched state, route choreography, telemetry sink, or ambient background preview
- 2026-06-09 00:59 CEST: controls UI polish replaced text glyph buttons with package-owned SVG icons and split bottom controls into smaller components to keep cognitive complexity and LOC under repo limits

Remaining:

- none for the current Phase 3 direct-file scope
- defer ambient background preview to Phase 7 per v1 scope cut

Verification:

- 2026-06-08 21:35 CEST: `bun run check`
- 2026-06-08 21:35 CEST: `bun run check-types`
- 2026-06-08 21:35 CEST: `bun run test`
- 2026-06-08 21:35 CEST: `bun run build`
- 2026-06-08 21:37 CEST: `bun run check`
- 2026-06-08 21:37 CEST: `bun run check-types`
- 2026-06-08 21:37 CEST: `bun run test`
- 2026-06-08 21:37 CEST: `bun run build`
- 2026-06-08 21:42 CEST: `bun run check`
- 2026-06-08 21:42 CEST: `bun run check-types`
- 2026-06-08 21:42 CEST: `bun run test`
- 2026-06-08 21:42 CEST: `bun run build`
- 2026-06-09 02:49 CEST: public stage props extraction passed `bun run check`, `bun run check-types`, targeted stage/control Vitest files with 2 files and 7 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, and `git diff --check`; `dist/index.d.ts` exports `VibePlayerStageProps`
- 2026-06-08 21:48 CEST: `bun run check`
- 2026-06-08 21:48 CEST: `bun run check-types`
- 2026-06-08 21:48 CEST: `bun run test`
- 2026-06-08 21:48 CEST: `bun run build`
- 2026-06-08 22:05 CEST: `bun run check`
- 2026-06-08 22:05 CEST: `bun run check-types`
- 2026-06-08 22:05 CEST: `bun run test`
- 2026-06-08 22:05 CEST: `bun run build`
- 2026-06-08 22:05 CEST: Browser page identity verified at `http://127.0.0.1:4177/demo/phase3-runtime.html` with title `Vibe Player Phase 3 Runtime QA`
- 2026-06-08 22:05 CEST: Browser console health verified with no `error` or `warn` logs during load, playback, modal, and mobile smoke checks
- 2026-06-08 22:05 CEST: Browser interaction proof: mute then play changed the inline player to active playback with `paused: false` and `currentTime > 1`
- 2026-06-08 22:05 CEST: Browser modal proof: opening the modal rendered a `role="dialog"` with player controls, and closing removed the dialog after the frozen exit transition
- 2026-06-08 22:05 CEST: Browser caption proof: custom caption chip rendered once while the native `TextTrack` stayed `disabled`
- 2026-06-08 22:05 CEST: Browser mobile proof at `390x844`: `hasHorizontalOverflow: false`, `bodyScrollWidth: 390`, `documentWidth: 390`, `stageWidth: 320`
- 2026-06-08 22:07 CEST: final `bun run check`, `bun run check-types`, `bun run test`, `bun run build`, and `git diff --check`
- 2026-06-09 03:20 CEST: stage test harness extraction moved `TestStageAdapter`, source fixture, factory, blocked-playback error, and media lookup helpers into internal `vibe-player-stage-test-helpers.ts`; `vibe-player-stage.test.tsx` dropped from 267 to 131 LOC and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted UI Vitest with 4 files and 12 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the stage test helper is not exported in `dist/index.d.ts`
- 2026-06-09 03:25 CEST: repo rules audit removed the final textual `expect.any(...)` matcher from `use-vibe-player-captions.test.tsx` while preserving the `AbortSignal` assertion through typed mock-call inspection; `rg` over `src` and `demo/vite` now finds no `any`, `.forEach()`, `enum`, or non-null assertion hits, and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted captions Vitest with 3 files and 7 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, and `git diff --check`
- 2026-06-09 05:54 CEST: bottom chrome button extraction moved play/mute/rate/captions/fullscreen/PiP helpers into internal `vibe-player-bottom-control-buttons.tsx`; targeted controls/stage Vitest passed with 2 files and 7 tests, and `bun run package:rules` passed with the new file included
- 2026-06-09 05:55 CEST: full validation after bottom chrome extraction passed `bun run ci` with 27 Vitest files and 101 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, and `git diff --check`
- 2026-06-09 06:04 CEST: stage action wiring extraction moved play/mute/seek/rate/quality/captions/fullscreen/PiP and shortcut command handlers into internal `use-vibe-player-stage-actions.ts`; focused UI Vitest passed with 3 files and 8 tests, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`

Reference inputs:

- `discover-video-controls.tsx`
- `discover-seek-control.tsx`
- `use-discover-player-chrome.ts`
- `discover-player-shortcuts.ts`
- `use-discover-player-shortcuts.ts`
- `discover-player-keyboard.ts`
- `discover-caption-overlay.tsx`

### Phase 4 — Discovery-parity skin/preset

Status: complete for the current package skin-token and CSS preset scope.

Goal: preserve the exact feel of the current Discover player.

Required work:

- port the relevant shell styling and motion
- port current shell shadow/border/backdrop recipe
- port current chrome movement and opacity behavior
- preserve close timing and open timing
- preserve timeline hover feel

Acceptance criteria:

- side-by-side visual QA against current Discover player is acceptable
- any intentional deviations are documented

Current progress:

- `src/skins/cinematic-default/tokens.ts` exports typed Discovery-parity skin tokens for motion, modal, shell, chrome, timeline, and captions
- `src/skins/cinematic-default/index.ts` exports the token contract and preserves the legacy compact `cinematicDefaultMotion` export
- `src/skins/cinematic-default/index.ts` exports `cinematicDefaultSkin`, the first package skin preset, with neutral-cinematic metadata and stable wrapper/class-name hooks
- `cinematicDefaultSkinClassNames.panel` remains as a compatibility alias for `modalPanel`
- `src/styles/vibe-player.css` scopes default CSS variables to both `:root` and `.vibe-player-skin--cinematic-default`, so host apps can wrap a subtree with the exported skin class
- token tests in `src/skins/cinematic-default/tokens.test.ts` freeze key reference values from Discovery
- shell CSS now uses the Discovery `rgba(0, 0, 0, 0.45)` surface instead of the earlier darker package-only surface
- `package.json` marks all package CSS files as side-effectful through `./src/styles/*.css`
- existing modal, chrome, timeline, and caption CSS already carry the frozen Discovery timing and geometry values validated in Phase 3

Remaining:

- side-by-side visual QA against live Discover remains useful before Phase 8 integration
- no route choreography, rail animation, watched state, or Discover telemetry belongs in this package skin preset

Verification:

- 2026-06-08 22:11 CEST: `bun run check`
- 2026-06-08 22:11 CEST: `bun run check-types`
- 2026-06-08 22:11 CEST: `bun run test`
- 2026-06-08 22:11 CEST: `bun run build`
- 2026-06-08 22:11 CEST: `bun run package:attw`
- 2026-06-08 22:11 CEST: `bun run package:publint` passed when rerun sequentially after `bun run build`
- 2026-06-08 22:14 CEST: Browser runtime DOM QA at `http://127.0.0.1:4178/demo/phase3-runtime.html` verified modal open, no console `error` or `warn`, no horizontal overflow, shell background `rgba(0, 0, 0, 0.45)`, shell radius `8px`, and backdrop opacity `0.7`
- 2026-06-08 22:14 CEST: Browser screenshot capture timed out twice in the Browser runtime, so Phase 4 visual proof is DOM/computed-style based for this pass
- 2026-06-09 02:11 CEST: skin preset contract pass added `VibePlayerSkinPreset`, `VibePlayerSkinMetadata`, `VibePlayerSkinClassNames`, and `cinematicDefaultSkin` with `intent: "neutral-cinematic"`; targeted skin tests passed with 1 file and 5 tests
- 2026-06-09 02:11 CEST: post-skin-contract `bun run check`, `bun run check-types`, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run build`, and full `bun run ci` passed with 25 test files and 92 tests

Reference inputs:

- `discover-ui-motion.ts`
- `discover-video-player.tsx`
- `discover-player-overlay.tsx`
- `use-discover-overlay-presence.ts`
- `discover-caption-overlay.tsx`
- `discover-seek-control.tsx`

### Phase 5 — HLS adapter

Status: complete for the current HLS VOD/live and managed quality-selection scope.

Goal: support `.m3u8` playback cleanly.

Required work:

- implement HLS adapter
- use managed `hls.js` where available for normalized controls and quality selection
- use native HLS fallback where managed playback is unavailable
- normalize loading, play, pause, ended, error, seek, duration
- handle live/HLS capability differences honestly

Acceptance criteria:

- VOD HLS works with timeline
- live HLS does not expose broken seek/duration UI
- controller capability branching remains clean

Current progress:

- source model already includes `VibePlayerHlsSource`
- `hls.js@1.6.16` is installed as a runtime dependency and locked in `bun.lock`
- `createHlsAdapter` exists and is exported from `src/adapters/index.ts`
- `createVibePlayerAdapter` now selects the HLS adapter for `type: "hls"` sources
- adapter prefers managed `hls.js` playback when MediaSource support exists, so normalized quality selection is available where possible
- adapter falls back to native HLS when managed HLS startup fails or MediaSource support is unavailable
- managed/native HLS load, fallback, and native/managed capability detection live in internal `src/adapters/hls-adapter-load.ts`
- HLS adapter quality option state is split into internal `src/adapters/hls-adapter-quality-state.ts`
- `src/adapters/create-hls-adapter.ts` is 266 LOC after adding the async load-generation guard, still below the 280 LOC hard limit
- `hls.js` is loaded through dynamic `import("hls.js")` only on managed HLS load, and `bun run build` keeps it out of the main package bundle with `--deps.never-bundle hls.js`
- adapter normalizes HLS manifest ready, level loaded, native media events, and HLS errors into the existing adapter event contract
- VOD HLS exposes seek and duration; live HLS disables seek and duration support honestly
- managed HLS exposes `Auto` plus available rendition options through `VibePlayerSnapshot.qualityOptions`
- `VibePlayerController.setQuality()` forwards quality selection through the adapter contract without HLS-specific UI branching
- package controls render a small `Quality` select only when `supportsQualitySelection` and multiple HLS renditions are available
- HLS quality labels normalize numeric hls.js names such as `720` to `720p`
- HLS async load hardening now destroys a managed controller that resolves after unmount and ignores stale callbacks from old load sessions
- HLS native fallback now checks load-session freshness before applying fallback source changes, so an old failed managed attach cannot overwrite a newer HLS source
- HLS load-session freshness is intentionally separate from native playback generation, so autoplay/play commands do not suppress later `MANIFEST_PARSED`, `LEVELS_UPDATED`, or quality callbacks
- HLS async load-session regression specs are split into `src/adapters/create-hls-adapter-load-session.test.ts`, keeping the main HLS adapter behavior spec at 181 LOC
- managed HLS sessions are destroyed on unmount and before adapter reload
- HLS unmount now clears native playback, destroys managed runtime state, resets live/source/video state, and returns idle snapshot/capabilities after teardown
- native file and HLS adapters share `src/adapters/native-video-dom.ts` for event binding, video metadata, caption track disabling, and snapshot logic
- native file and HLS adapters share `src/adapters/native-video-playback.ts` for guarded `play()`, command forwarding, stale resolution guards, volume clamping, fullscreen, Picture-in-Picture, and unmount media cleanup
- HLS shares the internal adapter listener contract with the file and YouTube adapters
- `demo/phase5-hls-runtime.html` imports the built package and maps `hls.js` through an import map for browser runtime QA

Remaining:

- deeper live-stream runtime QA should use a real live manifest when one is selected for product testing

Verification:

- 2026-06-08 22:19 CEST: post-refactor `bun run check`, `bun run check-types`, and targeted `bun run test -- src/adapters/create-file-adapter.test.ts`
- 2026-06-08 22:22 CEST: targeted HLS/file adapter tests passed with 2 files and 11 tests
- 2026-06-08 22:24 CEST: `bun run check`
- 2026-06-08 22:24 CEST: `bun run check-types`
- 2026-06-08 22:24 CEST: `bun run test` passed with 18 files and 50 tests
- 2026-06-08 22:24 CEST: `bun run build`
- 2026-06-08 22:24 CEST: `bun run package:publint`
- 2026-06-08 22:24 CEST: `bun run package:attw`
- 2026-06-08 22:24 CEST: `dist/index.js` contains dynamic `import("hls.js")` and does not inline the HLS runtime
- 2026-06-08 22:27 CEST: Browser runtime QA at `http://127.0.0.1:4179/demo/phase5-hls-runtime.html` loaded a real HLS VOD manifest with duration `634.634`, enabled seek, and had no console `error` or `warn`
- 2026-06-08 22:27 CEST: Browser HLS playback proof: muted play changed the player to `paused: false`, advanced `currentTime` past `2s`, and emitted `started`
- 2026-06-08 22:27 CEST: Browser mobile HLS proof at `390x844`: `hasHorizontalOverflow: false`, `bodyScrollWidth: 390`, `documentWidth: 390`, `stageWidth: 320`, and seek remained enabled
- 2026-06-08 22:27 CEST: Browser screenshot evidence captured for the HLS runtime demo
- 2026-06-09 01:56 CEST: managed HLS quality-selection pass completed; `bun run check`, `bun run check-types`, `bun run demo:vite:check`, `bun run demo:vite:build`, and full `bun run ci` passed with 25 test files and 89 tests
- 2026-06-09 01:56 CEST: browser QA on `http://127.0.0.1:5174/?quality=...` confirmed the Vite HLS demo uses managed HLS (`blob:` media URL), renders a `Quality` select with `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p`, and selecting `720p` sets the select value to `level:3`
- 2026-06-09 03:00 CEST: HLS load split moved managed/native load and fallback details into internal `hls-adapter-load.ts`; validation passed `bun run check`, `bun run check-types`, targeted HLS/PiP Vitest with 3 files and 14 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the new helper is not exported in `dist/index.d.ts`
- 2026-06-09 03:08 CEST: native playback helper extraction moved shared file/HLS stale `play()` guard, volume clamp, and unmount media cleanup out of adapter classes; validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted file/HLS/PiP Vitest with 4 files and 23 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that `NativePlaybackResolution`, `shouldPauseResolvedNativePlayback`, `clampNativeVideoVolume`, and `clearNativeVideoPlayback` are not exported in `dist/index.d.ts`
- 2026-06-09 03:11 CEST: shared native adapter test helper extraction reduced `create-hls-adapter.test.ts` from 272 to 237 LOC while keeping file/HLS pending-playback regression coverage; validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted file/HLS/PiP Vitest with 4 files and 23 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that `DeferredPlayback`, `createDeferredPlayback`, `defineNativeVideoNumberProperty`, and `getMountedNativeVideo` are not exported in `dist/index.d.ts`
- 2026-06-09 03:17 CEST: HLS adapter quality-state extraction moved option reset/update/select logic into internal `hls-adapter-quality-state.ts`; `create-hls-adapter.ts` dropped from 267 to 253 LOC and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted HLS/PiP Vitest with 3 files and 14 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that `HlsAdapterQualityState`, `createHlsAdapterQualityState`, and `MutableHlsAdapterQualityState` are not exported in `dist/index.d.ts`
- 2026-06-09 03:29 CEST: shared adapter listener extraction removed duplicate local listener aliases from file/HLS/YouTube adapters; targeted adapter Vitest passed with 5 files and 29 tests, and full validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that `VibePlayerAdapterListener` is not exported in `dist/index.d.ts`
- 2026-06-09 03:33 CEST: guarded native play extraction moved duplicated file/HLS `video.play()` stale-resolution pause logic into internal `playGuardedNativeVideo`; `create-hls-adapter.ts` dropped to 247 LOC and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted file/HLS/PiP Vitest with 4 files and 23 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, empty rules grep for `any`/`.forEach()`/`enum`/non-null assertions, and exact-symbol proof that `playGuardedNativeVideo` and `PlayGuardedNativeVideoInput` are not exported in `dist/index.d.ts`
- 2026-06-09 05:48 CEST: HLS cleanup hardening now resets managed runtime, live/source/video state, and returns idle snapshot/capabilities after unmount; targeted file/HLS/PiP Vitest passed with 4 files and 23 tests
- 2026-06-09 06:08 CEST: shared native command extraction moved HLS pause, play, seek, mute, rate, volume, fullscreen, and Picture-in-Picture command logic into internal `native-video-playback.ts`; `create-hls-adapter.ts` is now 233 LOC, focused file/HLS/PiP Vitest passed with 4 files and 23 tests, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:14 CEST: HLS source fixture and runtime probe moved into internal `hls-adapter-test-helpers.ts`, reducing `create-hls-adapter.test.ts` to 181 LOC while preserving focused file/HLS/PiP coverage and full package validation
- 2026-06-09 06:35 CEST: HLS load helper now owns native-vs-managed capability detection and unavailable-runtime errors, reducing `src/adapters/create-hls-adapter.ts` from 233 LOC to 222 LOC while preserving managed/native fallback behavior; focused HLS/PiP Vitest passed with 3 files and 14 tests
- 2026-06-09 07:16 CEST: HLS async load guard added a dedicated load generation and regression coverage for late managed-controller resolution after unmount, stale native fallback after a newer load, and quality callbacks that arrive after playback starts; focused HLS/PiP Vitest passed with 3 files and 17 tests
- 2026-06-09 07:16 CEST: fresh Browser QA on `http://localhost:5176/?qa=hls-generation-fixed-0715` confirmed managed `blob:` playback at `readyState=4`, `paused=false`, quality options `Auto`, `240p`, `380p`, `480p`, `720p`, `1080p`, successful `720p` selection, and no browser console warnings/errors
- 2026-06-09 07:27 CEST: HLS async load-session regression specs were split into internal `src/adapters/create-hls-adapter-load-session.test.ts`; `src/adapters/create-hls-adapter.test.ts` is now 181 LOC, the new load-session spec is 91 LOC, and focused HLS/PiP Vitest passed with 4 files and 17 tests

### Phase 6 — YouTube adapter

Status: complete for the current YouTube iframe playback and compliant external handoff scope.

Goal: support YouTube without corrupting the architecture.

Required work:

- implement YouTube adapter via iframe API
- normalize play/pause/time/duration/ended state as far as realistically possible
- support start time
- expose truthful capabilities
- degrade UI where feature parity is impossible

Acceptance criteria:

- YouTube plays through the same controller/UI shell
- unsupported features are hidden, not faked
- no DOM-provider special cases leak into shared controls

Current progress:

- source model already includes `VibePlayerYouTubeSource`
- `VibePlayerYouTubeSource.presentation` now supports default `iframe` playback and `external` handoff for headless-style surfaces that must not mount YouTube UI
- `createYouTubeAdapter` exists in `src/adapters/create-youtube-adapter.ts`
- `createYouTubeExternalAdapter` exists in `src/adapters/create-youtube-external-adapter.ts`
- `createVibePlayerAdapter` selects the iframe adapter for default YouTube sources and the external adapter when `presentation: "external"`
- `createVibePlayerYouTubeWatchUrl` provides the public URL helper used by external handoff mode
- official research on 2026-06-09 confirmed package YouTube playback must stay on the official IFrame API path; hidden/background/raw-stream playback or removing/obscuring YouTube player functionality is not a package feature
- YouTube player creation, 8s timeout, and late-resolve cleanup are split into internal `src/adapters/youtube-adapter-load.ts`, reducing `src/adapters/create-youtube-adapter.ts` from 257 LOC to 224 LOC
- YouTube adapter now destroys stale player/mount state, resets source/capabilities to idle on unmount, and cleans up the mount element if iframe player creation fails
- YouTube iframe API loading is isolated in `src/adapters/youtube-iframe-runtime.ts`
- YouTube iframe API handle/session/event contract types live in `src/adapters/youtube-iframe-types.ts`
- YouTube capability and snapshot truth lives in `src/adapters/youtube-adapter-state.ts`
- YouTube provider state-change normalization lives in internal `src/adapters/youtube-adapter-state-change.ts`
- YouTube sampled `timeupdate` lifecycle lives in internal `src/adapters/youtube-time-updates.ts`
- adapter uses the official YouTube iframe API model: load `https://www.youtube.com/iframe_api`, create `YT.Player`, listen to `onReady`, `onStateChange`, `onPlaybackRateChange`, and `onError`, and call `playVideo`, `pauseVideo`, `seekTo`, `setPlaybackRate`, `setVolume`, `mute`, `unMute`, `getDuration`, `getCurrentTime`, and `destroy`
- adapter supports `startSeconds` through iframe `playerVars.start`
- iframe runtime passes `origin` into `playerVars` by default and accepts source-level `origin` / `widgetReferrer` overrides
- external handoff mode renders a package-owned anchor/card with YouTube attribution, mounts no iframe or video, hides bottom playback controls through `supportsPlayback: false`, and keeps playback commands inert
- adapter normalizes YouTube playing, paused, ended, rate, volume, error, and sampled `timeupdate` events into the existing adapter event contract
- adapter state-change, timeupdate sampling, and command helpers keep `src/adapters/create-youtube-adapter.ts` at 217 LOC while preserving the existing iframe runtime contract
- adapter shares the same internal adapter listener contract as the file and HLS adapters
- YouTube duration, current time, loaded fraction, mute, volume, and playback rate are normalized into `VibePlayerSnapshot`
- package UI uses the same controller, inline player, stage, timeline, controls, analytics seam, and fullscreen command path for YouTube
- YouTube captions remain provider-native only: `canShowCaptions` is false and `hasNativeCaptionsMenu` is true, so the package custom-caption control is not faked
- YouTube PiP and quality selection remain unsupported: `canPictureInPicture` and `supportsQualitySelection` are false
- YouTube fullscreen is exposed only when the iframe provides `requestFullscreen`
- `demo/phase6-youtube-runtime.html` imports the built package and exercises an inline YouTube source through the normal player shell

Remaining:

- deeper manual QA should test real product YouTube content and browser-specific autoplay/user-gesture behavior before consumer integration
- YouTube native caption and quality menus are intentionally not normalized in package UI for this phase
- no YouTube-specific telemetry sink, route behavior, storage, or Discover copy exists in the package

Verification:

- 2026-06-08 22:35 CEST: initial `bun run check` and `bun run check-types` caught formatting/import/exact-optional/LOC issues in the new YouTube files; issues were fixed before continuing
- 2026-06-08 22:35 CEST: `bun run check`
- 2026-06-08 22:35 CEST: `bun run check-types`
- 2026-06-08 22:35 CEST: targeted adapter tests passed with 3 files and 16 tests
- 2026-06-08 22:36 CEST: `bun run check`
- 2026-06-08 22:36 CEST: `bun run check-types`
- 2026-06-08 22:36 CEST: `bun run test` passed with 19 files and 55 tests
- 2026-06-08 22:36 CEST: `bun run build`
- 2026-06-08 22:37 CEST: post-browser-fix `bun run check`
- 2026-06-08 22:37 CEST: post-browser-fix `bun run check-types`
- 2026-06-09 03:03 CEST: YouTube load split moved player creation, timeout, and late-resolve cleanup into internal `youtube-adapter-load.ts`; validation passed `bun run check`, `bun run check-types`, targeted YouTube Vitest with 2 files and 10 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the new helper is not exported in `dist/index.d.ts`
- 2026-06-09 03:29 CEST: shared adapter listener extraction removed the local YouTube listener alias and kept the helper internal; targeted adapter Vitest passed with 5 files and 29 tests, and full validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that `VibePlayerAdapterListener` is not exported in `dist/index.d.ts`
- 2026-06-09 06:40 CEST: YouTube command extraction moved play, pause, seek, mute, rate, volume, and fullscreen forwarding into internal `youtube-adapter-commands.ts`; `create-youtube-adapter.ts` is now 217 LOC, focused YouTube/controller Vitest passed with 5 files and 23 tests, and the public surface guard now forbids the command helper symbols from leaking
- 2026-06-09 08:50 CEST: YouTube external handoff added `presentation: "external"`, `supportsPlayback`, `createYouTubeExternalAdapter`, public YouTube watch URL helpers, iframe `origin` / `widgetReferrer` support, package CSS for the handoff card, and a Vite demo `YT Headless` source
- 2026-06-09 08:50 CEST: focused validation after YouTube external handoff passed `bunx vitest run src/core/vibe-player-youtube.test.ts src/adapters/create-youtube-external-adapter.test.ts src/adapters/youtube-iframe-runtime.test.ts src/core/vibe-player-controller.test.ts src/ui/vibe-player-controls.test.tsx` with 5 files and 23 tests
- 2026-06-09 08:50 CEST: full validation after YouTube external handoff passed `bun run check`, `bun run check-types`, `bun run package:rules`, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `bun run ci` with 33 Vitest files and 123 tests, and `git diff --check`
- 2026-06-08 22:37 CEST: post-browser-fix `bun run build`
- 2026-06-08 22:37 CEST: Browser runtime QA at `http://127.0.0.1:4186/demo/phase6-youtube-runtime.html` loaded a real YouTube iframe with `src` containing `/embed/M7lc1UVf-VE`, `start=2`, and `enablejsapi=1`
- 2026-06-08 22:37 CEST: Browser layout proof: iframe visible with `752x423`, stage `752x423`, and iframe classes `vibe-player-youtube-adapter-mount vibe-player-youtube-adapter-frame`
- 2026-06-08 22:37 CEST: Browser console proof: no `error` or `warning` logs during demo load
- 2026-06-08 22:38 CEST: final `bun run check`
- 2026-06-08 22:38 CEST: final `bun run check-types`
- 2026-06-08 22:38 CEST: final `bun run test` passed with 19 files and 55 tests
- 2026-06-08 22:38 CEST: final `bun run build`
- 2026-06-08 22:38 CEST: final `bun run package:publint`
- 2026-06-08 22:38 CEST: final `bun run package:attw`
- 2026-06-08 22:38 CEST: final `git diff --check`

Reference inputs:

- official YouTube IFrame Player API reference: `https://developers.google.com/youtube/iframe_api_reference`
- `VibePlayerYouTubeSource` in `src/core/vibe-player-types.ts`
- existing adapter contract in `src/core/vibe-player-types.ts`
- existing controller and UI shell paths from Phases 1 and 3
- YouTube cautions in this plan: captions are provider-owned, unsupported features must be hidden, and iframe logic must stay behind the adapter

### Phase 7 — Ambient preview layer

Status: complete for the current reusable ambient-preview scope.

Goal: package the reusable background media system inspired by Discovery.

Required work:

- extract crossfade background layer logic
- support poster fallback
- support reduced-motion mode
- support preview-to-player handoff patterns

Acceptance criteria:

- can be used independently of the modal player
- preserves cinematic crossfade feel

Current progress:

- `src/preview/index.ts` exports the preview module from the package root
- `VibePlayerAmbientPreviewSource` defines the package-owned neutral preview input shape: `posterUrl`, optional `fallbackPosterUrl`, optional `previewVideoUrl`, and optional stable `id`
- `VibePlayerBackgroundPreview` exists and owns reusable background poster/video layer orchestration independent of modal/player internals
- internal `VibePlayerBackgroundLayer` owns per-layer poster rendering, muted loop playback, first-frame readiness, reduced-motion pause behavior, and best-effort autoplay without being part of the public package export surface
- `VibePlayerAmbientPreview` exists as a higher-level wrapper with optional `onActivate` and accessible `activateLabel` for preview-to-player handoff patterns
- crossfade behavior preserves the Discovery reference values: `260ms cubic-bezier(0.645, 0.045, 0.355, 1)`, visible scale `1.006`, hidden scale `1.012`, and `300ms` retire delay
- frame-ready fallback timeout remains `2500ms`
- poster fallback is always visible immediately on first render; video fades in only after a renderable frame or fallback readiness
- layer state keeps at most two entries so the previous loop can stay visible while the next loop prepares
- cross-remount layer preservation is opt-in through `preserveKey`; without that key, a new preview instance does not inherit another instance's previous poster/video layer
- preview video pauses for reduced-motion viewers and when `paused` is true
- preview resumes best-effort when visible/intersecting and motion is allowed
- preview CSS lives in `src/styles/vibe-player-preview.css` and is imported by the package stylesheet
- preview browser-mock and DOM probe setup now lives in `src/preview/vibe-player-background-preview-test-helpers.ts`, keeping the preview behavior test focused and below the hard LOC limit
- `demo/phase7-ambient-preview-runtime.html` exercises ambient preview plus modal handoff through the public package build

Remaining:

- no app-specific Discovery media adapter exists yet; Phase 8 should adapt Discover `backgroundLoop`, `poster`, and `fullVideo` to package-owned preview/player inputs outside this package
- no analytics, routing, or storage belongs in the preview module
- deeper visual QA against live Discovery remains useful before Phase 8 integration

Verification:

- 2026-06-08 22:44 CEST: first `bun run check` caught rename/import/CSS ordering issues in new preview files; issues were fixed before continuing
- 2026-06-08 22:44 CEST: `bun run check-types`
- 2026-06-08 22:44 CEST: targeted preview tests passed with 1 file and 5 tests
- 2026-06-08 22:44 CEST: `bun run check`
- 2026-06-08 22:44 CEST: `bun run check-types`
- 2026-06-08 22:44 CEST: `bun run test` passed with 20 files and 60 tests
- 2026-06-08 22:44 CEST: `bun run build`
- 2026-06-08 22:45 CEST: post-browser-poster-fallback `bun run check`
- 2026-06-08 22:45 CEST: post-browser-poster-fallback `bun run check-types`
- 2026-06-08 22:45 CEST: post-browser-poster-fallback targeted preview tests passed with 1 file and 5 tests
- 2026-06-08 22:45 CEST: post-browser-poster-fallback `bun run build`
- 2026-06-08 22:46 CEST: Browser runtime QA at `http://127.0.0.1:4187/demo/phase7-ambient-preview-runtime.html` verified preview root rendered as an accessible button with `1084x609.75` desktop geometry, no horizontal overflow, visible poster fallback, and full-size video layer
- 2026-06-08 22:46 CEST: Browser handoff proof: clicking `Open ambient preview player` opened the normal `VibePlayerModal` dialog with stage geometry `989.546875x556.609375`
- 2026-06-08 22:46 CEST: Browser mobile proof at `390x844`: `hasHorizontalOverflow: false`, `bodyScrollWidth: 390`, `documentWidth: 390`, and preview width `354`
- 2026-06-08 22:46 CEST: Browser console proof: no `error` or `warning` logs during Phase 7 demo load and interaction
- 2026-06-08 22:48 CEST: final `bun run check`
- 2026-06-08 22:48 CEST: final `bun run check-types`
- 2026-06-08 22:48 CEST: final `bun run test` passed with 20 files and 60 tests
- 2026-06-08 22:48 CEST: final `bun run build`
- 2026-06-08 22:48 CEST: final `bun run package:publint`
- 2026-06-08 22:48 CEST: final `bun run package:attw`
- 2026-06-08 22:48 CEST: final `git diff --check`
- 2026-06-08 22:48 CEST: local QA server on port `4187` was stopped and the port was verified free
- 2026-06-09 02:00 CEST: preview preserve-key hardening added regression coverage for no-key isolation and shared-key remount preservation; targeted preview tests passed with 1 file and 7 tests
- 2026-06-09 02:52 CEST: preview public API cleanup moved background-layer state into an internal type file and removed `VibePlayerBackgroundLayer`, `VibePlayerBackgroundLayerProps`, `VibePlayerBackgroundLayerSnapshot`, and `VibePlayerBackgroundLayerState` from `dist/index.d.ts`; validation passed `bun run check`, `bun run check-types`, targeted preview Vitest with 1 file and 7 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, and `git diff --check`
- 2026-06-09 02:00 CEST: post-preview-hardening `bun run check`, `bun run check-types`, `bun run demo:vite:check`, `bun run demo:vite:build`, and full `bun run ci` passed with 25 test files and 91 tests
- 2026-06-09 03:23 CEST: preview test helper extraction moved browser media mocks, matchMedia/IntersectionObserver setup, source fixture, and poster/video DOM probes into internal `vibe-player-background-preview-test-helpers.ts`; `vibe-player-background-preview.test.tsx` dropped from 263 to 181 LOC and validation passed `bun run check`, `bun run lint`, `bun run check-types`, targeted preview Vitest with 1 file and 7 tests, `bun run build`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, `git diff --check`, and exact-symbol proof that the preview test helper is not exported in `dist/index.d.ts`

Reference inputs:

- `discover-background-video.tsx`
- `discover-media.ts`
- `discover-background-video.test.tsx`
- `discover-media.test.ts`

### Phase 8 — Discovery integration

Status: runtime hardening pass in progress; build-level integration complete and main live regressions fixed.

Goal: replace the current Discover player implementation with the package.

Required work:

- adapt Discover data to `VibePlayerSource`
- keep Discover telemetry outside the package
- keep rail/navigation outside the package
- swap current player shell to `@vibe-code/vibe-player`
- preserve route-level choreography

Acceptance criteria:

- Discovery keeps its existing feel
- package owns player internals
- Discover owns page-level composition and telemetry

Current progress:

- `apps/web/package.json` now depends on `@vibe-code/vibe-player` through `file:../../../vibe-player`
- `bun.lock` records the local package dependency
- `apps/web/next.config.ts` includes `transpilePackages: ["@vibe-code/vibe-player"]`
- `apps/web/src/app/layout.tsx` imports the package stylesheet directly so Next includes the package CSS in the app bundle
- `discover-vibe-player-source.ts` adapts Discover full-video/caption/poster data to `VibePlayerFileSource` and `VibePlayerHlsSource`
- `discover-vibe-player-source.ts` sets `autoPlay: true` for Discover file playback to preserve the old native `<video autoPlay>` contract
- `discover-vibe-player-resume.ts` keeps existing Discover resume behavior behind the package `VibePlayerResumeStore` seam
- `DiscoverVideoPlayer` now renders `VibePlayerStage` and no longer owns native `<video>` state, custom caption rendering, controls, seek, rate, mute, fullscreen, or shortcut internals
- `DiscoverVideoPlayer` passes package `topActions` for the Discover YouTube link instead of hardcoding Discover-specific UI inside the package
- `useDiscoverPlaybackTelemetry` maps package analytics events to Discover playback events and keeps the oRPC telemetry sink outside the package
- `DiscoverPlayerOverlay` still owns modal shell, backdrop, rail arrows, thumbnail rail, Escape close behavior, and overlay presence
- package code still has no imports from Discover, `apps/web`, Next.js routing, app telemetry, browser storage, or app aliases
- package file playback now uses native `video.src` for single-file sources, keeps `crossOrigin` opt-in instead of forced, and leaves native `video.autoplay` disabled so Stage owns autoplay lifecycle
- file and HLS adapters now hard-stop pending playback after `pause()` or `unmount()`, clear media on unmount, and guard against stale play promises
- `VibePlayerStage` now closes the active source on `open=false`, waits for a real media mount target before loading, and re-mounts the media target idempotently so React/Turbopack re-renders cannot leave a detached audio-playing video
- native media events now surface `buffering` for `waiting`, `stalled`, and `seeking`, and Stage shows a package-owned loading status for `loading`/`buffering`
- controller state now tracks browser-blocked playback attempts as `playbackBlocked` with a normalized `playblocked` event, so autoplay policy failures are not confused with ordinary paused playback
- Stage now shows a package-owned `Play to start` status after a browser `NotAllowedError` blocks playback, while preserving the same controller/adapter contract for file, HLS, and YouTube sources
- controller event handling now also accepts adapter-emitted `playblocked` events, so iframe providers without rejected `play()` promises can surface the same package-owned blocked state
- YouTube playback start now keeps a provider watchdog through transient `playing`, `paused`, and `buffering` states after a package `play()` intent; persistent non-playing states emit normalized `playblocked`
- YouTube playback-start watchdog now completes after real time advancement, preventing false `playblocked` statuses during later provider buffering after playback has actually begun
- YouTube playback-start watchdog now treats `playing` without time advancement as still unproven, so a frozen provider start can still surface `playblocked`
- YouTube state-change handling now completes the start watchdog when current time has already advanced before a sampled `timeupdate`, preventing false blocked-start states during quick provider transitions
- controller load now sets `currentSource` before adapter mount/load events, so asynchronous providers such as YouTube cannot emit host-visible ready state with a missing source id
- native Picture-in-Picture is now enabled for file and HLS playback through adapter capabilities, package controls, and `VibePlayerStage` command wiring; unsupported browsers and YouTube keep `canPictureInPicture: false`
- Discover telemetry now ignores package `opened` events because Discover already records `opened` from its own overlay lifecycle
- YouTube iframe runtime now has callback polling, script-error handling, and an 8s timeout; the adapter also has an 8s player-creation timeout so a blocked provider cannot hang the stage indefinitely
- controller load errors now produce `lastEvent: "error"` with `snapshot.readyState: "error"`, and Stage renders a package-owned unavailable status for that state
- YouTube `unstarted` is treated as a ready iframe surface after player creation; actual buffering still maps to `buffering`
- media target mounting no longer re-runs on every render, preventing repeated adapter remount/event loops around provider load states
- package muted-autoplay bootstrap now keeps playback muted after a successful bootstrap start; it no longer calls `setMuted(false)` immediately after `play()`, which could leave Discover full-video playback paused by browser policy
- package unmute action retries `play()` when unmuting an already-playing source, preserving the explicit user gesture path for browsers that pause media on programmatic unmute
- package play intent now surfaces a buffering state immediately after `controller.play()` before slow native/provider playback events arrive, so large progressive assets do not leave the UI looking idle while the browser starts playback
- package `supportsPlayback` capability now prevents external/handoff sources from showing playback chrome or surfacing fake play intent states
- YouTube `presentation: "external"` is available to future Discover or other product surfaces that need a headless-style YouTube handoff without embedding the YouTube player
- live Discover browser QA now proves package controls, captions toggle, close/reopen cleanup, and rail route navigation on `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1`
- live Discover browser QA on the exact `http://localhost:3001/discover/jeff-weinstein` origin now proves opening the overlay starts the full video muted with package controls showing `Pause` and `Unmute`
- automation clicks on the full-video audible-start controls still trigger browser-blocked playback or browser-policy pause and show the package-owned recovery controls, so actual audible human-click start remains the main manual QA item
- Discover playback telemetry now has a mocked hook test proving package `started`, `progress_*`, `completed`, and `closed` events map to Discover oRPC telemetry while duplicate package events stay deduped
- `useDiscoverPlaybackTelemetry` now dedupes the `onCompleted` callback itself, not only the `completed` telemetry event
- package resume restore now preserves the old Discover near-end guard: saved positions within the final second of a finite video are not restored
- Discover's `discoverVibePlayerResumeStore` adapter is now covered by a unit test proving `set`, `get`, and `clear` use the existing Discover resume memory
- `docs/integration.md` now documents the consumer setup contract for CSS imports, Next/package transpilation, host-owned telemetry/resume, muted autoplay/audio policy, CORS, faststart MP4 requirements, HLS preference for long assets, and the private `file:` dependency policy
- `docs/integration.md` now documents YouTube iframe vs external presentation modes and explicitly states that external is a handoff, not hidden/background/raw-stream playback

Remaining:

- continue live visual QA on the user-managed `http://localhost:3001/discover/jeff-weinstein` route until actual human-click audible start and human-playback resume after unmute are proven; muted automated long-playback and cleanup are now proven, but audible human-gesture playback remains manual QA
- fix the Jeff Weinstein full-video asset/CDN path: the MP4 is about 670 MiB and has `moov` after `mdat`, so it should be remuxed with `ffmpeg -movflags +faststart` or replaced with HLS/renditions; Cloudflare range probes for the large full video are dynamic/bypass rather than a reliable edge hit
- align production CORS before using `crossOrigin` for full-video playback; localhost returned CORS headers, but `https://spreadu.com` and `https://www.spreadu.com` did not during this pass
- the local `file:../../../vibe-player` dependency is documented as active private integration only and should be converted to a versioned internal release or workspace policy before externalization
- old Discover player-internal files such as `use-discover-video-player-state.ts`, `discover-video-controls.tsx`, and `discover-caption-overlay.tsx` remain in the tree for now; remove them only after live QA confirms no rollback path is needed and their tests are retired intentionally

Verification:

- 2026-06-08 23:07 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` updated the lockfile for the local package dependency
- 2026-06-08 23:07 CEST: first `bun run check` caught formatting and unnecessary `undefined` issues in the integration files; issues were fixed before continuing
- 2026-06-08 23:07 CEST: target Discover tests passed with 3 files and 6 tests: `discover-video-player.test.tsx`, `discover-vibe-player-source.test.ts`, and `discover-player-events.test.ts`
- 2026-06-08 23:07 CEST: `bun run --cwd apps/web check-types`
- 2026-06-08 23:07 CEST: `bun run --cwd apps/web build` completed successfully and confirmed Next/Turbopack can compile the local package and CSS import
- 2026-06-08 23:07 CEST: root `bun run check`
- 2026-06-08 23:07 CEST: root `bun run check-types` passed with 63 of 63 packages successful
- 2026-06-08 23:07 CEST: `git diff --check` in `/Users/tomrobak/_projects_/spreadoo`
- 2026-06-08 23:56 CEST: live QA on `http://localhost:3001/discover/jeff-weinstein` showed background autoplay remained correct and muted; the broken surface was the main overlay player
- 2026-06-08 23:56 CEST: live QA found package CSS was not reliably loaded when imported through `globals.css`; moved package CSS import to `apps/web/src/app/layout.tsx`
- 2026-06-08 23:56 CEST: live QA found forced `crossOrigin="anonymous"` blocked Discover full-video media metadata because the file endpoint does not send CORS headers; package file sources now keep CORS opt-in
- 2026-06-08 23:56 CEST: live QA found single MP4 playback should match the old Discover `<video src=...>` path; package file adapter now uses `video.src` for single-source file media instead of a child `<source>`
- 2026-06-08 23:56 CEST: live QA/user report found duplicated audio risk after autoplay; package file adapter now pauses, clears `src`, clears children, reloads, and removes media on unmount, and pending `play()` pauses if it resolves after unmount
- 2026-06-08 23:56 CEST: package target checks passed: `bun run check`, `bun run check-types`, `vitest` adapter/stage targets, and `bun run build`
- 2026-06-08 23:56 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local `file:` package cache after package rebuilds
- 2026-06-08 23:56 CEST: target Spreadoo Discover tests passed with 4 tests: `discover-video-player.test.tsx`, `discover-vibe-player-source.test.ts`, and `discover-page-client.mocked.test.tsx`
- 2026-06-09 00:37 CEST: MP4 range/atom audit found Jeff Weinstein full video layout `ftyp/free/mdat/moov`, with `moov` at byte `701507755`; this is not faststart and explains slow metadata/start/frozen-frame risk for a 670 MiB progressive MP4
- 2026-06-09 00:37 CEST: package target checks passed after runtime hardening: `bun run check`, `bun run check-types`, targeted adapter/controller/stage/control Vitest files, and `bun run build`
- 2026-06-09 00:37 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local package cache after package rebuilds
- 2026-06-09 00:37 CEST: target Spreadoo Discover tests passed with 4 tests: `discover-video-player.test.tsx`, `discover-vibe-player-source.test.ts`, and `discover-page-client.mocked.test.tsx`
- 2026-06-09 00:37 CEST: browser QA on `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1` showed the dialog now contains one stage video with the full MP4 source, `readyState=4`, duration `1449.834`, and no `crossorigin`; after close, the dialog and stage video are removed and only the muted background loop remains
- 2026-06-09 00:43 CEST: package playback-blocked hardening passed `bun run check`, `bun run check-types`, targeted controller/stage/controls/file/HLS Vitest files, and `bun run build`
- 2026-06-09 00:43 CEST: new tests prove `NotAllowedError` from `play()` sets controller `lastEvent: "playblocked"` and `playbackBlocked: true`, and Stage renders the `Play to start` status after rejected autoplay
- 2026-06-09 00:44 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local package cache after the playback-blocked package build
- 2026-06-09 00:44 CEST: target Spreadoo Discover tests passed again with 4 tests: `discover-video-player.test.tsx`, `discover-vibe-player-source.test.ts`, and `discover-page-client.mocked.test.tsx`
- 2026-06-09 00:52 CEST: native Picture-in-Picture package pass completed for file/HLS adapters and controls; `bun run check`, `bun run check-types`, targeted PiP/control/stage Vitest files, `bun run build`, and full `bun run ci` passed with 22 test files and 75 tests
- 2026-06-09 00:53 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local package cache after the PiP package build; target Spreadoo Discover tests passed again with 4 tests
- 2026-06-09 00:59 CEST: icon-only controls pass completed; `bun run check`, `bun run check-types`, targeted controls/stage Vitest files, and `bun run build` passed
- 2026-06-09 08:50 CEST: `bun install --force` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local `file:` dependency after package CSS gained `vibe-player-youtube-external.css`
- 2026-06-09 08:50 CEST: the running Spreadoo `next dev --port=3001` process still served a stale Turbopack transform for the old package CSS import; the dev server was restarted on `localhost:3001`
- 2026-06-09 08:50 CEST: Browser QA on `http://localhost:3001/discover/jeff-weinstein?youtubeExternalCacheCheck=3` confirmed no missing-CSS overlay, page title `Jeff Weinstein | Discover Spreadu`, and only the known Meta Pixel permissions warning in fresh logs
- 2026-06-09 08:50 CEST: Browser Discover smoke after package refresh confirmed opening `Play video` creates a dialog and package stage with two total videos: paused/muted background at `readyState=4` and one package full-video at `readyState=4`, `paused=false`, `muted=true`; closing with `Escape` removes the dialog/stage and leaves one background video
- 2026-06-09 01:00 CEST: full package `bun run ci` passed after icon-only controls split with 22 test files and 75 tests; `publint` reported all good and `attw` passed the ESM-only profile
- 2026-06-09 01:00 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local package cache after the icon controls build; target Spreadoo Discover tests passed again with 4 tests
- 2026-06-09 01:01 CEST: browser QA on `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1` confirmed the overlay controls render icon-only package buttons with `aria-label`, hover `title`, empty text content, and SVG icons for Close, Pause, Unmute, Hide captions, Full screen, and Picture in picture; closing the overlay removed the dialog and stage video, leaving only the muted background video
- 2026-06-09 01:41 CEST: YouTube runtime hardening passed targeted Vitest files for the iframe runtime, YouTube adapter, controller, and Stage, plus `bun run check`, `bun run check-types`, `bun run demo:vite:check`, `bun run demo:vite:build`, and full `bun run ci` with 24 test files and 86 tests
- 2026-06-09 01:41 CEST: browser QA on `http://127.0.0.1:5174/?qa=...` confirmed the Vite demo File source renders one video at `readyState=4` with `5.05s` duration, HLS renders one video at `readyState=4` with `634.63s` duration, and YouTube renders one iframe embed without the stale `Loading` status
- 2026-06-09 02:17 CEST: browser QA on `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1` confirmed initial page state has no dialog, one muted background video, and the `Play video` action
- 2026-06-09 02:17 CEST: opening the Discover overlay produced one dialog, one package stage, one caption overlay, one muted background video, and one package full-video element with `readyState=4`, `1449.834s` duration, and one text track
- 2026-06-09 02:17 CEST: package controls rendered as icon buttons for Close, Play, Mute, Hide captions, Full screen, and Picture in picture; captions toggle removed the caption overlay and exposed `Show captions`, and playback-rate control changed `1x` to `1.25x`
- 2026-06-09 02:17 CEST: close/reopen cleanup proof confirmed close removes the dialog, stage, and stage video while leaving exactly one muted background loop, and reopen creates exactly one stage video with the full MP4 source and captions track
- 2026-06-09 02:17 CEST: route-navigation proof confirmed the rail card for Henry Modisett navigates to `/discover/henry-modisett` with no dialog/stage leak, then the browser was returned to `/discover/jeff-weinstein?vibePlayerCleanup=1`
- 2026-06-09 02:17 CEST: automation click on the stage Play control did not start playback and produced the expected package `Play to start` blocked-playback status; actual audible human-click start remains unproven by browser automation
- 2026-06-09 02:17 CEST: console filter for `localhost:3001` returned no error/warning entries during this QA pass
- 2026-06-09 04:26 CEST: browser QA on `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1` reconfirmed background autoplay before open, one dialog package stage after open, one full-video element at `readyState=4`, `duration=1449.83`, one caption track, and no console errors/warnings
- 2026-06-09 04:26 CEST: Discover close cleanup still removes the dialog, package stage, caption overlay, and full-video element, leaving exactly one muted background loop playing; no duplicate active audible videos were observed during automated QA
- 2026-06-09 04:26 CEST: Discover automation clicks on the package `Play` control, including coordinate-level click, still produce the browser-blocked `Play to start` state instead of audible playback; this remains a human-click QA gap, not proof that the user gesture path is fixed
- 2026-06-09 07:46 CEST: package muted-autoplay bootstrap was hardened to keep media muted after successful bootstrap playback, with new `vibe-player-stage-autoplay.test.ts` coverage proving it calls `muted:true` then `play` without unmuting
- 2026-06-09 07:46 CEST: package unmute action was hardened to retry `play()` when unmuting an already-playing source, with `vibe-player-stage.test.tsx` coverage proving `Unmute` sends `muted:false` followed by `play`
- 2026-06-09 07:46 CEST: after `bun run build` and `bun install --force` in Spreadoo refreshed the active `file:` package cache, live Browser QA on `http://localhost:3001/discover/jeff-weinstein?unmuteResumeFixed=1` confirmed overlay open starts the full-video element muted and playing at `currentTime=5.689s`, `paused=false`, `muted=true`, `readyState=4`, `duration=1449.834`, one caption track, package controls `Pause`/`Unmute`, background video paused under overlay, and no browser warning/error logs
- 2026-06-09 07:46 CEST: the same Browser QA confirmed automation still cannot prove audible playback: clicking `Unmute` changed the full video to `muted=false` but browser policy paused it, and clicking `Play` afterward kept the package-owned `Play to start` recovery status; this remains a human/browser gesture QA item, not a package architecture blocker
- 2026-06-09 07:49 CEST: README and integration guide now document the real muted-autoplay contract, including that successful bootstrap playback remains muted and that audible playback needs a real human-click smoke test on the target origin
- 2026-06-09 08:05 CEST: Browser long-playback QA on `http://localhost:3001/discover/jeff-weinstein?longSmoke=1` confirmed the full-video element advanced from `17.901s` to `48.941s` over about 31s with `paused=false`, `muted=true`, `readyState=4`, and only two videos in the overlay: paused muted background plus muted full video
- 2026-06-09 08:05 CEST: close cleanup in the same long-playback QA removed the dialog, `.vibe-player-stage`, and full-video element, leaving exactly one muted background loop playing
- 2026-06-09 08:05 CEST: after the controller source-identity fix, `bun run build` plus `bun install --force` in Spreadoo refreshed the active `file:` package cache; `apps/web/node_modules/@vibe-code/vibe-player/dist/index.js` contains the new `currentSource: source` load path
- 2026-06-09 08:05 CEST: Browser QA on `http://localhost:3001/discover/jeff-weinstein?postSourceIdentityFixBrowser=1` confirmed overlay open starts the full-video element muted and playing, with `currentTime` advancing from `2.056s` to `14.087s` over 12s, `readyState=4`, `duration=1449.834`, one caption track, background video paused under overlay, and no non-Meta browser warnings/errors
- 2026-06-09 08:05 CEST: close cleanup after the post-source-identity QA removed the dialog, package stage, and full-video element, leaving one muted background loop; this reconfirms no duplicate full-video/audio element remains after close
- 2026-06-09 08:14 CEST: controller play-intent hardening added immediate `buffering` state after `controller.play()` with regression coverage in `vibe-player-controller.test.ts`, while blocked playback still rolls back to the adapter snapshot and `playblocked`
- 2026-06-09 08:14 CEST: after `bun run build` and `bun install --force` refreshed the Spreadoo `file:` package cache, active `apps/web/node_modules/@vibe-code/vibe-player/dist/index.js` contains `createPlayIntentSnapshot`
- 2026-06-09 08:14 CEST: Browser QA on `http://localhost:3001/discover/jeff-weinstein?playIntentSmoke=1` confirmed overlay open starts the full-video element muted and playing, `currentTime` advancing from `2.256s` to `8.29s`, `readyState=4`, one caption track, paused background under overlay, close cleanup removing dialog/stage/full-video, and no non-Meta warnings/errors
- 2026-06-09 02:23 CEST: added `use-discover-playback-telemetry.mocked.test.tsx` in Spreadoo to prove Discover-owned `opened` telemetry, package `opened` ignore behavior, source-id filtering, progress/completion mapping, closed telemetry, and duplicate completion callback dedupe
- 2026-06-09 02:23 CEST: target Spreadoo telemetry test passed with 1 file and 1 test; target Discover integration set passed with 4 files, 5 tests, and 22 assertions
- 2026-06-09 02:23 CEST: Spreadoo scoped validation passed for the telemetry files: `npx ultracite check ...`, `bun run --cwd apps/web check-types`, and `git diff --check -- ...`
- 2026-06-09 02:28 CEST: package resume parity pass added `shouldRestoreVibePlayerResumePosition`, preserving valid seekable resumes while skipping stale operations, unseekable sources, empty times, and finite-duration positions within the final second
- 2026-06-09 02:28 CEST: Discover resume adapter test now proves `discoverVibePlayerResumeStore` writes to, reads from, and clears the existing Discover resume memory
- 2026-06-09 02:28 CEST: package full `bun run ci` passed with 26 test files and 95 tests; `bun run demo:vite:check` and `bun run demo:vite:build` also passed
- 2026-06-09 02:28 CEST: Spreadoo scoped validation passed for resume/telemetry touched files: target Discover test set passed with 5 files, 10 tests, and 35 assertions; `bun run --cwd apps/web check-types`, `npx ultracite check ...`, and `git diff --check -- ...` passed
- 2026-06-09 02:32 CEST: consumer integration guide added at `docs/integration.md` and linked from `README.md`, covering CSS import, package transpilation, host-owned seams, CORS, faststart MP4, HLS preference, and pre-rollout verification
- 2026-06-09 02:38 CEST: post-documentation package validation passed: `bun run check`, `bun run check-types`, and `git diff --check`

### Phase 9 — Externalization decision

Status: complete for the current private-package release-readiness decision.

Goal: decide whether the package should remain private/internal or become a public/released package.

Required work:

- assess real consumer count
- assess API stability
- assess dependency cleanliness
- assess release burden

Acceptance criteria:

- public release happens only if there is a real maintenance case

Current progress:

- repo is already standalone and private
- package should remain private until provider contract, skin contract, and integration story stabilize
- current `package.json` keeps `"private": true`, `UNLICENSED`, and restricted publish config, matching the current no-public-release decision
- ESM-only package shape is intentional for now and is validated by the `package:attw` ESM-only profile
- README now reads as consumer-first package documentation, with real `VibePlayerStage`, source-shape, integration, demo, and validation examples instead of repo-scaffold guidance
- `package.json` `files` now ships only consumer-facing docs plus build artifacts: `README.md`, `CHANGELOG.md`, `docs/integration.md`, `dist`, and package CSS files

Verification:

- 2026-06-09 00:45 CEST: full package `bun run ci` passed: `bun run check`, `bun run check-types`, full Vitest suite with 21 files and 70 tests, `bun run build`, `package:publint`, and `package:attw`
- 2026-06-09 00:45 CEST: `publint run --strict --pack npm` reported `All good!`
- 2026-06-09 00:45 CEST: `attw . --pack --profile esm-only --exclude-entrypoints ./styles.css` passed for ESM and bundler consumers; the CJS resolution warning is intentionally ignored by the ESM-only profile
- 2026-06-09 02:46 CEST: `bun pm pack --dry-run` confirmed the tarball includes `README.md`, `CHANGELOG.md`, `docs/integration.md`, dist, and package CSS files, without repo-internal agent docs or the working plan
- 2026-06-09 02:46 CEST: post-docs/manifest validation passed: `bun run check`, `bun run check-types`, `bun run demo:vite:check`, `bun run package:publint`, `bun run package:attw`, and `git diff --check`
- 2026-06-09 03:43 CEST: full package `bun run ci` passed with Biome, TypeScript, 26 Vitest files and 95 tests, package build, publint, and ATTW
- 2026-06-09 03:43 CEST: `bun pm pack --dry-run` confirmed the package tarball contains exactly 12 consumer-facing files: docs, dist, and package CSS files
- 2026-06-09 03:43 CEST: `dist/index.d.ts` exact-symbol audit found no exported internal playback helpers, adapter listeners, HLS quality state internals, stage test harnesses, preview test helpers, controller harnesses, or background-layer internals
- 2026-06-09 03:43 CEST: source-rule audit over `src` and `demo/vite` found no `any`, `.forEach()`, enums, or non-null assertions; LOC audit confirmed all source/config files remain under the 280 LOC hard limit
- 2026-06-09 03:43 CEST: `git diff --check` passed after the accumulated package, demo, docs, and style changes
- 2026-06-09 03:50 CEST: packaged Vite consumer gate added so the same demo can build through the package `exports` and fresh `dist/index.js`, not only through source aliases
- 2026-06-09 03:50 CEST: full package `bun run ci` passed after the packaged-demo script/config pass with Biome, TypeScript, 26 Vitest files and 95 tests, build, publint, and ATTW
- 2026-06-09 03:54 CEST: automated public surface guard added at `scripts/assert-public-surface.mjs`; `bun run ci` now runs `package:surface` after `build` and fails if expected public symbols disappear or known internal helpers leak into `dist/index.d.ts`
- 2026-06-09 03:54 CEST: full package `bun run ci` passed with the new surface gate included, plus `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, LOC audit, source-rule audit over `scripts`, `src`, and `demo/vite`, and `git diff --check`
- 2026-06-09 03:57 CEST: automated coding-rule guard added at `scripts/assert-coding-rules.mjs`; `bun run ci` now runs `package:rules` after Biome and fails on files over 280 LOC, explicit `any`, `.forEach()` calls, enum declarations, or non-null assertions across package source, scripts, root config, and Vite demo source/config files
- 2026-06-09 03:57 CEST: full package `bun run ci` passed with both automated package gates included, plus `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and a LOC audit showing the largest scanned file is 251 LOC
- 2026-06-09 04:00 CEST: automated package archive guard added at `scripts/assert-package-tarball.mjs`; `bun run ci` now runs `package:tarball` and fails unless the `bun pm pack --dry-run` archive contains exactly the 12 intended consumer-facing files
- 2026-06-09 04:00 CEST: full package `bun run ci` passed with `package:rules`, `package:surface`, and `package:tarball`, plus `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and a LOC audit showing the largest scanned file is 251 LOC
- 2026-06-09 04:03 CEST: automated package boundary guard added at `scripts/assert-package-boundaries.mjs`; `bun run ci` now runs `package:boundaries` and fails if package source imports app aliases, Discover modules, Spreadoo/app paths, or Next.js modules
- 2026-06-09 04:03 CEST: full package `bun run ci` passed with `package:rules`, `package:boundaries`, `package:surface`, and `package:tarball`, plus `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and a LOC audit showing the largest scanned file is 251 LOC
- 2026-06-09 04:07 CEST: automated dependency manifest guard added at `scripts/assert-package-dependencies.mjs`; `bun run ci` now runs `package:dependencies` and fails if runtime, peer, or dev dependency keys drift away from the current package architecture
- 2026-06-09 04:07 CEST: full package `bun run ci` passed with `package:rules`, `package:boundaries`, `package:dependencies`, `package:surface`, and `package:tarball`, plus `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and a clean LOC audit excluding generated demo build output
- 2026-06-09 04:54 CEST: YouTube adapter playback watchdog now covers stuck iframe start states after a package `play()` intent; targeted Vitest for the YouTube adapter and controller passed with 2 files and 14 tests
- 2026-06-09 04:54 CEST: visible Browser QA on `http://localhost:5174/` confirmed clicking the package YouTube `Play` control leaves controls hit-testable above the iframe and changes the stage status to `Play to start` when YouTube does not start playback under automation; browser console errors/warnings stayed empty
- 2026-06-09 04:54 CEST: package validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run demo:vite:check`, `bun run package:rules`, `bun run test` with 26 files and 97 tests, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci` with 97 tests, and `git diff --check`; touched source files remain under the 280 LOC hard limit
- 2026-06-09 05:01 CEST: YouTube playback-start watchdog was extracted to internal `src/adapters/youtube-playback-watchdog.ts`, and the adapter regression now proves actual time advancement completes the start watchdog so later `buffering` stays `buffering` instead of becoming a false `playblocked`
- 2026-06-09 05:01 CEST: validation after watchdog extraction passed targeted YouTube/controller Vitest with 2 files and 14 tests, `bun run check`, `bun run lint`, `bun run check-types`, `bun run package:rules`, `bun run package:boundaries`, `bun run package:dependencies`, `bun run demo:vite:check`, `bun run test` with 26 files and 97 tests, full `bun run ci`, `bun run demo:vite:build`, and `bun run demo:vite:packaged:build`
- 2026-06-09 05:05 CEST: YouTube playback-start watchdog timeout semantics were tightened so provider `playing` without real time advancement still emits `playblocked`; focused watchdog Vitest now proves both frozen-start blocking and successful cancellation after time advancement
- 2026-06-09 05:05 CEST: validation after frozen-start watchdog hardening passed targeted YouTube/watchdog/controller Vitest with 3 files and 16 tests, `bun run check`, `bun run lint`, `bun run check-types`, `bun run package:rules`, `bun run package:boundaries`, `bun run package:dependencies`, `bun run demo:vite:check`, `bun run test` with 27 files and 99 tests, full `bun run ci`, `bun run demo:vite:build`, and `bun run demo:vite:packaged:build`
- 2026-06-09 05:10 CEST: YouTube adapter now completes the playback-start watchdog during provider state changes when `currentTime` already advanced before the next sampled `timeupdate`; adapter Vitest proves a quick post-progress `paused` state remains `pause` instead of becoming a false `playblocked`
- 2026-06-09 05:10 CEST: validation after quick-transition watchdog hardening passed targeted YouTube/watchdog/controller Vitest with 3 files and 17 tests, `bun run check`, `bun run lint`, `bun run check-types`, `bun run package:rules`, `bun run package:boundaries`, `bun run package:dependencies`, `bun run demo:vite:check`, `bun run test` with 27 files and 100 tests, full `bun run ci`, `bun run demo:vite:build`, and `bun run demo:vite:packaged:build`
- 2026-06-09 05:13 CEST: YouTube adapter runtime fixtures, event collection, and stalled-player runtime were moved into internal `src/adapters/youtube-adapter-test-helpers.ts`; `create-youtube-adapter.test.ts` dropped from 280 LOC to 171 LOC and the helper is 136 LOC, restoring the 150-200 LOC target for the main behavior test file
- 2026-06-09 05:13 CEST: validation after YouTube adapter test-helper extraction passed targeted YouTube/watchdog/controller Vitest with 3 files and 17 tests, `bun run check`, `bun run lint`, `bun run check-types`, `bun run package:rules`, `bun run package:boundaries`, `bun run package:dependencies`, `bun run demo:vite:check`, `bun run test` with 27 files and 100 tests, full `bun run ci`, `bun run demo:vite:build`, and `bun run demo:vite:packaged:build`
- 2026-06-09 05:42 CEST: YouTube adapter cleanup hardening now resets source/state on unmount and failed iframe creation; targeted YouTube/watchdog Vitest passed with 2 files and 11 tests, and full validation passed `bun run check`, `bun run check-types`, `bun run package:rules`, `bun run package:boundaries`, `bun run package:dependencies`, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and full `bun run ci` with 27 Vitest files and 101 tests
- 2026-06-09 06:00 CEST: YouTube adapter state-change and timeupdate sampler extraction moved provider state transition logic into internal `youtube-adapter-state-change.ts` and timer lifecycle into internal `youtube-time-updates.ts`; focused YouTube Vitest passed with 4 files and 16 tests, and full validation passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 05:48 CEST: native File/HLS cleanup hardening returned adapters to idle snapshot/capabilities after unmount; targeted File/HLS/PiP Vitest passed with 4 files and 23 tests, and full validation passed `bun run check`, `bun run check-types`, `bun run package:rules`, `bun run package:boundaries`, `bun run package:dependencies`, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and full `bun run ci` with 27 Vitest files and 101 tests
- 2026-06-09 05:55 CEST: full package validation after internal bottom-control button extraction passed `bun run ci` with 27 Vitest files and 101 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, and `git diff --check`
- 2026-06-09 06:00 CEST: full package validation after YouTube adapter state-change/timeupdate split passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:04 CEST: full package validation after stage action hook extraction passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:08 CEST: full package validation after shared native command extraction passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:14 CEST: full package validation after controller command and adapter test fixture extraction passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:20 CEST: full package validation after controller load lifecycle extraction passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:29 CEST: full package validation after Vite demo stage root/action split passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:35 CEST: full package validation after HLS load capability detection split passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 06:40 CEST: full package validation after YouTube command helper extraction passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 07:01 CEST: full package validation after file adapter test-harness extraction and demo typecheck path hardening passed `bun run ci` with 29 Vitest files and 106 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 07:16 CEST: full package validation after HLS async load-generation hardening passed `bun run ci` with 29 Vitest files and 109 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 07:27 CEST: full package validation after the HLS load-session test split passed `bun run package:rules`, `bun run demo:vite:check`, full `bun run ci` with 30 Vitest files and 109 tests, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 07:46 CEST: full package validation after muted-autoplay and unmute-resume hardening passed focused UI/autoplay Vitest with 4 files and 15 tests, `bun run check`, `bun run check-types`, `bun run package:rules`, full `bun run ci` with 31 Vitest files and 113 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 07:49 CEST: documentation validation after muted-autoplay contract docs passed `bun run check`, `bun run check-types`, `bun run package:rules`, and `git diff --check`; `README.md` is 151 LOC and `docs/integration.md` is 111 LOC

### Standalone Vite demo — provider showcase

Status: complete for the current package QA pass.

Goal: provide a real Vite app that exercises the package player directly, without pretending to be Discovery.

Current progress:

- demo source lives in `demo/vite`
- `demo/vite/index.html` is the Vite HTML entrypoint
- `demo/vite/index.html` preconnects to the active File, HLS, and YouTube demo media/provider origins
- `demo/vite/vite.config.ts` uses Vite `8.0.16`, `@vitejs/plugin-react` `6.0.2`, and source aliases for `@vibe-code/vibe-player` and `@vibe-code/vibe-player/styles.css` in normal development mode
- `demo/vite/vite.config.ts --mode packaged` disables the source aliases and consumes the package through its built `exports` surface
- `demo/vite/tsconfig.json` maps the package entrypoint and package CSS entry to `../../src` during source-mode typecheck so demo source validation is not coupled to generated `dist`
- `bun run demo:vite` and `bun run demo:vite:packaged` bind Vite to `localhost` so the visible demo URL matches the browser QA origin
- `demo/vite/src/app.tsx` owns the package-demo workbench, active source switching, analytics feed, and opt-in localStorage resume store
- `demo/vite/src/app.tsx` applies `cinematicDefaultSkin.classNames.root` so the demo exercises the public skin preset contract instead of hardcoding the wrapper class
- `demo/vite/src/demo-sources.ts` defines File, HLS, YouTube iframe, and YouTube external handoff package `VibePlayerSource` fixtures
- `demo/vite/src/components/player-shell.tsx` renders `DemoPlayerStage`, a Vite-demo assembly built from public package primitives so the demo can expose live controller state while still using package adapters, controller hooks, captions, controls, shortcuts, and chrome behavior
- `demo/vite/src/components/player-shell.tsx` enables muted autoplay bootstrap for File and HLS demo sources while leaving YouTube as a manual provider-gesture surface
- `demo/vite/src/components/demo-player-stage-actions.ts` keeps demo playback, mute, seek, playback-rate, quality, fullscreen, Picture-in-Picture, and caption commands out of the stage component
- `demo/vite/src/components/demo-player-stage-autoplay.ts` keeps the demo autoplay path muted after startup, so File and HLS visibly play under normal browser autoplay policy and users can opt into audio through the package Mute/Unmute control
- `demo/vite/src/components/demo-player-stage-dom.ts` keeps demo status text and interactive-click detection out of the stage component
- `demo/vite/src/components/demo-player-stage-root.tsx` keeps demo root focus, pointer, click-to-play, keyboard chrome reveal, and idle chrome interactions out of the stage component
- `demo/vite/src/components/demo-player-stage.tsx` is now 179 LOC after the root/action split, with root interactions and command forwarding in focused helpers
- `demo/vite/src/components/source-rail.tsx` owns provider switching
- `demo/vite/src/components/source-rail.tsx` exposes active provider state through `aria-pressed` and demo-owned visual state
- `demo/vite/src/components/analytics-feed.tsx` shows normalized package analytics events, provider/source/capability proof, and live controller snapshot state for the active source
- `demo/vite/src/styles/*.css` owns only demo layout/chrome around the package player
- `demo/vite/public/captions/showcase.vtt` provides a real caption track for file and HLS demos
- generated Vite build output is ignored through `build/` in `.gitignore`
- generated packaged-demo build output is ignored through `build-packaged/` in `.gitignore`

Verification:

- 2026-06-09 01:41 CEST: `bun run check`
- 2026-06-09 01:41 CEST: `bun run check-types`
- 2026-06-09 01:41 CEST: `bun run demo:vite:check`
- 2026-06-09 01:41 CEST: `bun run demo:vite:build`
- 2026-06-09 01:41 CEST: full `bun run ci` passed with 24 test files and 86 tests, then package build, publint, and ATTW
- 2026-06-09 01:41 CEST: browser QA confirmed File, HLS, and YouTube demo surfaces at `http://127.0.0.1:5174/`
- 2026-06-09 01:56 CEST: browser QA confirmed the HLS Vite demo exposes managed HLS quality selection with normalized `p` labels and working UI selection
- 2026-06-09 02:00 CEST: post-preview-hardening `bun run demo:vite:check`, `bun run demo:vite:build`, and full `bun run ci` passed with 25 test files and 91 tests
- 2026-06-09 02:06 CEST: browser QA on `http://127.0.0.1:5174/` confirmed File renders one video at `readyState=4` with `5.055s` duration, HLS renders one managed `blob:` video at `readyState=4` with `634.584s` duration plus `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p` quality options, and YouTube renders one iframe embed without stale `Loading` or `Playback unavailable` status
- 2026-06-09 02:11 CEST: browser QA on `http://127.0.0.1:5174/` confirmed the demo root has `vp-demo-app vibe-player-skin--cinematic-default` and the scoped skin CSS variables are active
- 2026-06-09 02:40 CEST: visible in-app browser smoke on `http://localhost:5174/` confirmed File renders the package stage with one video, HLS renders one managed `blob:` video with `readyState=4` and quality options, YouTube renders one iframe, and current-origin console errors/warnings are empty
- 2026-06-09 03:43 CEST: `bun run demo:vite:check` and `bun run demo:vite:build` passed on Vite `8.0.16`, producing the demo HTML, CSS, app bundle, lazy HLS chunk, and copied caption asset
- 2026-06-09 03:43 CEST: visible browser QA on `http://localhost:5174/` confirmed File uses a real MP4 `<video>` at `readyState=4` with one caption track, HLS uses a managed `blob:` `<video>` at `readyState=4` with `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p` quality options, and YouTube renders a real iframe with `enablejsapi=1` and `origin=http://localhost:5174`
- 2026-06-09 03:43 CEST: muted playback QA confirmed File and HLS transition through package controls to `Pause` while the native video is actually playing, then pause cleanly; YouTube transitions through the package Play/Pause state against the iframe adapter without console errors
- 2026-06-09 03:43 CEST: rich HLS controls QA confirmed selecting `720p`, toggling captions to disabled, and cycling playback rate to `1.25x` update the actual player state and package controls with no browser console errors
- 2026-06-09 03:45 CEST: registry checks confirmed the demo/runtime stack is on current latest releases: Vite `8.0.16`, `@vitejs/plugin-react` `6.0.2`, React `19.2.7`, and `hls.js` `1.6.16`
- 2026-06-09 03:50 CEST: `bun run demo:vite:packaged:build` passed and proved the Vite demo can consume the built package through `exports` after `bun run build`, producing a separate `demo/vite/build-packaged` output
- 2026-06-09 03:50 CEST: packaged preview smoke on `http://127.0.0.1:5175/` confirmed the dist-backed demo renders the File stage, exposes File/HLS/YouTube source buttons, loads the MP4 at `readyState=4`, includes one caption track, and logs no browser errors or warnings
- 2026-06-09 03:50 CEST: post-packaged-demo validation passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, LOC audit, source-rule audit, and `git diff --check`
- 2026-06-09 04:10 CEST: responsive browser QA on `http://localhost:5174/` confirmed the Vite demo has no horizontal overflow at desktop, 390px mobile, or 320px narrow mobile viewports; File, HLS, and YouTube mobile source switching rendered cleanly with controls inside the stage and no browser error/warning logs
- 2026-06-09 04:10 CEST: 320px narrow mobile QA confirmed `documentScrollWidth=320`, source cards fit into three 93px columns, the package stage renders at `270x240`, bottom controls fit within `254px`, and File controls remain accessible
- 2026-06-09 04:26 CEST: File demo source now uses the longer `https://media.w3.org/2010/05/sintel/trailer_hd.mp4` progressive MP4 without CORS opt-in, replacing the 5-second MDN sample so package controls can be inspected during normal playback instead of immediately hitting ended state
- 2026-06-09 04:26 CEST: `bun run demo:vite:check` and `bun run demo:vite:build` passed after the File demo source update
- 2026-06-09 04:26 CEST: visible browser QA on `http://localhost:5174/` confirmed File muted playback reaches `paused=false`, `currentTime=4.359`, `duration=52.208`, and a real `1920x1080` video frame; pause returns the control to `Play` with no active media
- 2026-06-09 04:26 CEST: visible browser QA confirmed HLS muted playback reaches `paused=false`, `currentTime=9.638`, `duration=634.584`, a managed `blob:` source, and `1280x720` video dimensions; pause cleanup leaves no active media
- 2026-06-09 04:26 CEST: visible browser QA confirmed YouTube renders the package source card, package top-level controls, and a real `enablejsapi=1` iframe with `origin=http://localhost:5174`, with no browser error/warning logs; the in-app Browser cannot click controls positioned over the cross-origin iframe, so manual YouTube click remains a human QA item
- 2026-06-09 04:29 CEST: post-parallel-agent integration validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run demo:vite:check`, `bun run package:rules`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci` with 26 test files and 95 tests, and `git diff --check`
- 2026-06-09 04:29 CEST: Vite demo LOC audit confirmed the largest demo source/style/config file is `demo/vite/src/styles/app.css` at 195 LOC, below the 280 LOC hard limit
- 2026-06-09 04:36 CEST: YouTube chrome hardening added `autoHide: false` for YouTube stages so package Play, Mute, Timeline, Rate, and Full screen controls remain visible after the normal idle delay instead of becoming unreachable behind the cross-origin iframe
- 2026-06-09 04:36 CEST: Browser hit-target QA on `http://localhost:5174/` confirmed that after `5200ms` idle on the YouTube source, `elementFromPoint` at the centers of package Play, Mute, Timeline, Playback speed, and Full screen returns the package button/input elements, not the YouTube iframe; browser console errors/warnings stayed empty
- 2026-06-09 04:36 CEST: package YouTube Play control can now be clicked by Browser automation without hitting the iframe boundary, but YouTube `playVideo()` still does not start playback under this automation pass, so real YouTube playback remains a human/provider user-gesture QA item
- 2026-06-09 04:36 CEST: targeted validation after YouTube chrome hardening passed `bunx vitest run src/react/use-vibe-player-chrome.test.tsx src/ui/vibe-player-stage.test.tsx`, `bun run check`, `bun run lint`, `bun run check-types`, `bun run demo:vite:check`, and `bun run package:rules`
- 2026-06-09 04:38 CEST: final package validation after YouTube chrome hardening passed `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci` with 26 test files and 96 tests, and `git diff --check`; touched source files remain under the 280 LOC hard limit
- 2026-06-09 04:54 CEST: parallel demo agent verified that `demo/vite` is already a real package-player demo for File, HLS, and YouTube using `VibePlayerStage`, real `VibePlayerSource` fixtures, and the same package shell; no demo-only code changes were needed
- 2026-06-09 04:54 CEST: visible Browser QA on `http://localhost:5174/` confirmed YouTube package controls remain hit-testable above the iframe and a failed/stuck YouTube start now surfaces the package-owned `Play to start` state instead of staying silently on `Loading`; browser console errors/warnings stayed empty
- 2026-06-09 04:54 CEST: demo/package validation passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `bun run check`, `bun run lint`, `bun run check-types`, `bun run package:rules`, `bun run test` with 26 files and 97 tests, full `bun run ci`, and `git diff --check`
- 2026-06-09 05:01 CEST: visible Browser smoke on `http://localhost:5174/` reconfirmed the YouTube package `Play`, `Mute`, `Seek`, `Playback speed`, and `Full screen` controls remain hit-testable above the iframe after the watchdog helper extraction, and a stuck YouTube start shows `Play to start` with no browser console errors/warnings
- 2026-06-09 05:01 CEST: post-refactor demo/package validation passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci`, and `git diff --check`
- 2026-06-09 05:05 CEST: post-watchdog-hardening demo/package validation passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and full `bun run ci` with 27 test files and 99 tests
- 2026-06-09 05:10 CEST: post-quick-transition watchdog validation passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and full `bun run ci` with 27 test files and 100 tests
- 2026-06-09 05:13 CEST: post-YouTube-test-helper extraction validation passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and full `bun run ci` with 27 test files and 100 tests
- 2026-06-09 05:18 CEST: Vite demo dev scripts were switched from `127.0.0.1` to `localhost` after confirming the package is already on current Vite `8.0.16`; validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run demo:vite:check`, `bun run package:rules`, `bun run package:dependencies`, `bun run package:boundaries`, `bun run demo:vite:build`, and `bun run demo:vite:packaged:build`
- 2026-06-09 05:28 CEST: parallel demo agent changes were integrated by keeping the richer live-state Vite demo assembly and fixing the import-order gate in `demo/vite/src/components/demo-player-stage-actions.ts`; validation passed `bun run check`, `bun run lint`, `bun run check-types`, `bun run demo:vite:check`, `bun run package:rules`, `bun run package:dependencies`, `bun run package:boundaries`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 05:28 CEST: visible Browser QA on `http://localhost:5173/?qa=0518` confirmed the page title, nonblank demo shell, no framework overlay, File source with one ready MP4 video and `52.208s` duration, HLS source with one ready managed `blob:` video, `634.584s` duration, and `Auto`/`240p`/`380p`/`480p`/`720p`/`1080p` quality options, and YouTube source with a real `enablejsapi=1` iframe using `origin=http://localhost:5173`
- 2026-06-09 05:28 CEST: muted Browser playback QA confirmed File and HLS can both advance through the visible package controls once muted; audible playback still needs human-browser confirmation because Browser automation trips the package `playblocked` path for unmuted native playback
- 2026-06-09 05:31 CEST: full `bun run ci` passed after Vite demo integration with 27 Vitest files and 100 tests, package build, public surface guard, tarball guard, publint, and ATTW
- 2026-06-09 05:37 CEST: Vite demo muted-autoplay bootstrap was restored for File and HLS through `demo-player-stage-autoplay.ts`; visible Browser QA on `http://localhost:5173/?qa=autoplay-muted-0535` proved File advanced from `24.881s` to `26.334s` with `paused=false` and `muted=true`, and HLS advanced from `148.092s` to `149.745s` with `paused=false`, `muted=true`, managed `blob:` playback, and quality options still present
- 2026-06-09 05:37 CEST: validation after muted-autoplay demo hardening passed `bun run check`, `bun run demo:vite:check`, `bun run package:rules`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, `git diff --check`, and full `bun run ci` with 27 Vitest files and 100 tests
- 2026-06-09 06:20 CEST: parallel demo audit confirmed `demo/vite` is a real Vite 8.0.16 React app using public package entrypoints, package CSS, real File/HLS/YouTube `VibePlayerSource` fixtures, package controls, live state, and analytics
- 2026-06-09 06:20 CEST: visible Browser QA on `http://localhost:5173/?qa=controller-load-0620` confirmed page identity, nonblank demo shell, no framework overlay, empty console warnings/errors, File muted autoplay at `paused=false`, HLS managed `blob:` playback at `readyState=4`, HLS quality options `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p` with successful `720p` selection, and a YouTube `enablejsapi=1` iframe with package Play/Mute/Rate/Fullscreen controls
- 2026-06-09 06:20 CEST: demo/package validation after controller load lifecycle extraction passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci` with 29 Vitest files and 106 tests, and `git diff --check`
- 2026-06-09 06:29 CEST: Vite demo stage root/action split moved focus, pointer, click-to-play, keyboard chrome reveal, and idle chrome interactions into `demo-player-stage-root.tsx`, expanded `demo-player-stage-actions.ts` to own all demo controller commands, and reduced `demo-player-stage.tsx` to 179 LOC
- 2026-06-09 06:29 CEST: visible Browser QA on `http://localhost:5173/?qa=stage-root-split-0629` confirmed File muted autoplay, root click pause behavior, HLS muted playback with `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p` quality options, YouTube `enablejsapi=1` iframe with package controls, and no browser console warnings/errors
- 2026-06-09 06:29 CEST: demo/package validation after the Vite demo stage split passed `bun run check`, `bun run demo:vite:check`, `bun run package:rules`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci` with 29 Vitest files and 106 tests, and `git diff --check`
- 2026-06-09 06:35 CEST: visible Browser HLS smoke on `http://localhost:5173/?qa=hls-load-helper-0635` confirmed managed `blob:` playback at `readyState=4`, `paused=false`, `muted=true`, `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p` quality options, and no browser console warnings/errors after the HLS load helper split
- 2026-06-09 06:40 CEST: visible Browser YouTube smoke on `http://localhost:5173/?qa=youtube-command-helper-0640` confirmed one `enablejsapi=1` iframe, package Play/Mute/Rate/Fullscreen controls, package Play click reaching the expected automation-only `playblocked` / `Play to start` state, and no browser console warnings/errors after the YouTube command helper split
- 2026-06-09 07:01 CEST: visible Browser QA on `http://localhost:5173/?qa=full-demo-0648` confirmed page identity, nonblank standalone demo shell, no framework overlay, empty browser warning/error logs, File muted autoplay with a real MP4 frame, HLS managed `blob:` playback with one video and successful `720p` quality selection, and YouTube with one `enablejsapi=1` iframe plus package controls reaching the expected automation-only `playblocked` state
- 2026-06-09 07:01 CEST: mobile Browser QA at `390x844` confirmed `bodyWidth=390`, three source buttons, visible shell/panel, one active File video, and no browser console warnings/errors
- 2026-06-09 07:01 CEST: demo source-mode typecheck now stays source-bound through `demo/vite/tsconfig.json` paths, while `bun run demo:vite:packaged:build` still disables Vite aliases and builds through the package `exports` surface after `bun run build`
- 2026-06-09 07:16 CEST: fresh Vite Browser QA on `http://localhost:5176/?qa=hls-generation-fixed-0715` confirmed the standalone demo still exposes HLS quality options after muted autoplay starts playback, and selecting `720p` updates the live player state to `Quality720p`
- 2026-06-09 07:27 CEST: registry check `npm view vite version` confirmed Vite `8.0.16` is still the latest release, and visible Browser QA on `http://localhost:5177/?qa=final-demo-check` confirmed File muted autoplay with a real MP4 video, HLS managed `blob:` playback with `Auto`, `240p`, `380p`, `480p`, `720p`, and `1080p` options plus successful `level:3` / `720p` selection, YouTube `enablejsapi=1` iframe rendering with package controls, expected automation-only YouTube `playblocked` state after Play, and empty browser warning/error logs
- 2026-06-09 07:29 CEST: parallel demo worker independently confirmed no demo edits were needed: `demo/vite` already uses the real package entry/CSS, exposes File/HLS/YouTube fixtures and provider-appropriate controls, passes desktop/mobile Browser QA without horizontal overflow or console warnings/errors, and Vite `8.0.16` plus `@vitejs/plugin-react` `6.0.2` are current latest releases
- 2026-06-09 08:05 CEST: parallel demo audit found one real issue: the demo analytics panel could show `Live state mounting` for YouTube even after the iframe and snapshot were ready, because provider events could arrive before controller `currentSource` was committed
- 2026-06-09 08:05 CEST: controller load now commits source identity before adapter mount/load events, with `vibe-player-controller.test.ts` regression coverage proving adapter `ready` events emitted during load do not surface a missing source id
- 2026-06-09 08:05 CEST: Browser QA on `http://localhost:5173/?qa=final-demo-check` confirmed the standalone Vite demo after the fix: File renders one muted playing MP4 with captions, HLS renders one muted managed `blob:` stream with successful `level:3` quality selection, and YouTube renders one `enablejsapi=1` iframe while the demo panel shows `Live state vite-demo-youtube`
- 2026-06-09 08:05 CEST: validation after the source-identity fix passed focused controller/YouTube Vitest with 4 files and 23 tests, full `bun run ci` with 31 files and 114 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 08:14 CEST: Browser QA on `http://localhost:5173/?qa=play-intent-smoke` confirmed the standalone Vite demo after play-intent hardening: File renders one muted playing MP4 with captions, HLS renders one muted managed `blob:` stream, HLS quality selection updates to `level:3`, YouTube renders one iframe, source identity remains present in the demo panel, and demo-origin warning/error logs are empty
- 2026-06-09 08:14 CEST: validation after play-intent hardening passed focused controller/stage/controls/autoplay Vitest with 4 files and 20 tests, full `bun run ci` with 31 files and 115 tests, `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, and `git diff --check`
- 2026-06-09 08:50 CEST: Vite demo added `YT Headless`, a `presentation: "external"` YouTube source for the compliant no-iframe handoff path
- 2026-06-09 08:50 CEST: Browser QA on `http://localhost:5174/?qa=youtube-headless-fresh` confirmed `YT Headless` renders a package-owned handoff link with YouTube attribution and `Watch on YouTube` CTA, zero iframes, zero videos, no Play button, no timeline, and no current-demo warning/error logs
- 2026-06-09 08:50 CEST: Browser QA on the same demo confirmed switching back to the normal YouTube source renders one iframe with `origin=http://localhost:5174` and restores package playback controls
- 2026-06-09 08:50 CEST: mobile Browser QA at `390x844` confirmed `YT Headless` renders without horizontal overflow and keeps the handoff CTA visible
- 2026-06-09 08:50 CEST: validation after `YT Headless` passed `bun run demo:vite:check`, `bun run demo:vite:build`, `bun run demo:vite:packaged:build`, full `bun run ci` with 33 Vitest files and 123 tests, and `git diff --check`

## Test Strategy

This package should be test-heavy because the risk is mostly behavior regressions, not syntax.

### Unit tests

- time formatting
- progress milestones
- keyboard shortcut mapping
- caption parsing
- capability branching
- controller state transitions

### Adapter tests

- file adapter event normalization
- HLS adapter capability truth
- YouTube adapter capability truth
- error propagation

### UI tests

- idle-hidden chrome becomes non-focusable
- pointer-through decorative layers stay click-through
- unsupported controls do not render
- reduced-motion mode disables transform-heavy behavior

### Visual/runtime QA

- direct file modal
- HLS modal
- YouTube modal
- inline mode
- caption toggle
- fullscreen
- background-preview handoff

### Discovery regression tests later

When Discovery integrates the package:

- parity smoke for modal open/close timing
- parity smoke for chrome hide/reveal behavior
- parity smoke for caption overlay positioning
- parity smoke for outside-click close
- parity smoke for route-level coexistence with rail and background scene

## Dependencies and Implementation Notes

### New dependency expectation

HLS support will likely require `hls.js`.

That dependency should be added only when Phase 5 starts, not before.

### YouTube caution

YouTube support must not be designed as “just drop iframe into the current player shell”.

That shortcut will create a permanent split-brain architecture.

### React/DOM caution

The controller should be provider-aware, but the DOM mounting seam should stay inside adapters. Shared UI must not own provider-specific DOM trees.

## Explicit Non-Goals for V1

Do not include these in the first shipping cut:

- DRM playback
- DASH
- editing/transcoding pipeline concerns
- playlist management
- comments/chat overlays
- ad insertion
- provider-specific settings menus
- downloadable analytics backend inside the package

These can come later if real consumers require them.

## Discovery Integration Strategy Later

Discovery should become a consumer of the package, not the package owner.

### Discovery should keep owning

- route transitions
- page background scene composition
- prev/next rail
- watched state
- marketing copy
- telemetry pipeline
- page-level SEO/JSON-LD

### Vibe Player should own

- playback runtime
- provider integration
- player chrome
- modal shell internals
- timeline behavior
- captions rendering path
- keyboard behavior inside the player

## Open Questions

These need explicit answers during implementation, not hand-waving.

1. Resolved 2026-06-09: v1 includes native Picture-in-Picture for file and HLS playback when the browser exposes the native API; YouTube PiP remains unsupported in package UI.
2. Resolved 2026-06-09: the first exported skin is neutral-cinematic (`cinematic-default`) with Discovery-grade reference motion and chrome values; product-branded or Discovery-named skins can be added later without changing the default package contract.
3. Resolved 2026-06-09: ambient background preview is part of the initial package release through package-owned preview exports, with app-specific media adaptation left to host integrations.
4. Resolved 2026-06-09: no default persistence is enabled by player assemblies; v1 provides opt-in memory/localStorage resume store helpers and keeps the host responsible for passing `resumeStore`.
5. Resolved 2026-06-09: v1 includes managed HLS quality selection when hls.js exposes multiple rendition levels; native HLS remains a fallback without package-level quality selection.
6. Resolved 2026-06-09: `youtube_headless` should not mean hidden YouTube playback. The package supports official iframe playback for in-player YouTube and `presentation: "external"` for a compliant headless-style handoff without iframe/player chrome.

## Final Recommendation

Build `@vibe-code/vibe-player` in `/Users/tomrobak/_projects_/vibe-player` with this order:

1. freeze the contract
2. build the headless controller
3. build the file adapter
4. rebuild the cinematic UI as package-owned
5. add Discovery-parity skin
6. add HLS
7. add YouTube
8. only then integrate Discovery

The critical mindset is:

- **do not extract the current Discover player blindly**
- **do extract its quality bar**
- **do rebuild the runtime around adapters**
- **do preserve the motion and visual discipline as a first-class system**

If this order is respected, the package can become a genuine reusable standard. If not, we will end up with a Discover-specific player that permanently struggles with YouTube and HLS.
