# Vibe Player Plan

Status: in progress; Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, and Phase 9 complete; Phase 8 Discovery integration in runtime hardening pass
Created: 2026-06-08 19:52 CEST
Last verified: 2026-06-09 00:37 CEST
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

Verified in `/Users/tomrobak/_projects_/vibe-player` on 2026-06-08 23:07 CEST:

- package scaffold exists in `package.json` for ESM build, typecheck, lint, Vitest, publint, and ATTW
- source union, capability model, normalized event names, adapter contract, resume seam, and analytics seam exist in `src/core/vibe-player-types.ts`
- controller lifecycle, command forwarding, resume restore, adapter swap, and session analytics exist in `src/core/vibe-player-controller.ts`
- progress milestone helper exists in `src/core/vibe-player-events.ts`
- session analytics deduplication and progress event creation exist in `src/core/vibe-player-analytics.ts`
- initial controller state creation exists in `src/core/vibe-player-controller-state.ts`
- time formatting, duration, clamp, idle snapshot, and idle capabilities helpers exist in `src/core/vibe-player-time.ts`
- native file adapter exists in `src/adapters/create-file-adapter.ts`
- file adapter DOM helpers exist in `src/adapters/file-adapter-dom.ts`
- native file adapter keeps native caption tracks disabled so the custom caption overlay is the single caption renderer
- HLS adapter exists in `src/adapters/create-hls-adapter.ts`
- HLS adapter DOM helpers exist in `src/adapters/hls-adapter-dom.ts`
- shared native video DOM helpers exist in `src/adapters/native-video-dom.ts`
- React binding exists in `src/react/use-vibe-player-controller.ts`
- caption loading hook exists in `src/react/use-vibe-player-captions.ts`
- idle chrome hook exists in `src/react/use-vibe-player-chrome.ts`
- overlay presence hook exists in `src/react/use-vibe-player-overlay-presence.ts`
- shortcut binding hook exists in `src/react/use-vibe-player-shortcuts.ts`
- modal, inline, shell, and shared stage components exist in `src/ui`
- custom caption overlay exists in `src/ui/vibe-player-caption-overlay.tsx`
- package-owned controls exist in `src/ui/vibe-player-controls.tsx`
- inline player assembly exists in `src/ui/vibe-player-inline.tsx`
- modal player assembly exists in `src/ui/vibe-player-modal.tsx`
- shared player stage exists in `src/ui/vibe-player-stage.tsx`
- package-owned timeline exists in `src/ui/vibe-player-timeline.tsx`
- controls CSS lives in `src/styles/vibe-player-controls.css` and is imported from `src/styles/vibe-player.css`
- timeline CSS lives in `src/styles/vibe-player-timeline.css` and is imported from `src/styles/vibe-player.css`
- modal overlay/backdrop CSS lives in `src/styles/vibe-player-modal.css` and is imported from `src/styles/vibe-player.css`
- preview CSS lives in `src/styles/vibe-player-preview.css` and is imported from `src/styles/vibe-player.css`
- Discovery-parity cinematic skin tokens live in `src/skins/cinematic-default/tokens.ts`
- ambient preview package exports live in `src/preview`
- `VibePlayerBackgroundPreview` owns poster/video crossfade layers independently of the modal player
- `VibePlayerAmbientPreview` wraps the background preview with optional `onActivate` handoff behavior without owning player internals
- WebVTT parsing and active-caption lookup exist in `src/captions/parse-webvtt.ts`
- runtime QA harnesses exist in `demo/phase3-runtime.html`, `demo/phase5-hls-runtime.html`, `demo/phase6-youtube-runtime.html`, and `demo/phase7-ambient-preview-runtime.html`
- current tests cover controller lifecycle, command forwarding, adapter swap, resume, analytics, progress milestones, native file adapter behavior, HLS adapter behavior, YouTube adapter behavior, ambient preview behavior, inline player assembly behavior, modal player assembly behavior, caption hook behavior, idle chrome behavior, overlay presence behavior, caption overlay rendering, controls, timeline, shortcuts, playback-rate cycling, time helpers, and WebVTT parsing
- YouTube adapter exists in `src/adapters/create-youtube-adapter.ts`
- YouTube iframe API loader/runtime bridge exists in `src/adapters/youtube-iframe-runtime.ts`
- YouTube iframe API contract types exist in `src/adapters/youtube-iframe-types.ts`
- YouTube snapshot and capability normalization lives in `src/adapters/youtube-adapter-state.ts`
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
- opt-in resume store helpers exist in `src/core/vibe-player-resume-store.ts`: `createMemoryVibePlayerResumeStore` and `createLocalStorageVibePlayerResumeStore`
- controller skeleton exists in `src/core/vibe-player-controller.ts`
- progress milestone helper exists in `src/core/vibe-player-events.ts`
- time helpers exist in `src/core/vibe-player-time.ts`
- controller tests now cover mount, load, adapter swap, command forwarding, seek analytics, resume restore, progress milestones, started/completed/closed analytics, and teardown
- session analytics are deduplicated through `src/core/vibe-player-analytics.ts`
- controller file size is back under the hard 280 LOC limit after extracting analytics and initial-state helpers
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
- adapter rejects unsupported source types and empty file sources through rejected promises
- adapter tests cover DOM output, capabilities, event normalization, command forwarding, seek/volume clamping, fullscreen support, and error cases
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
- `VibePlayerTimeline` exists with clamped progress, disabled no-duration state, range input, focus halo, current point, hover ghost point, and tooltip behavior
- `getVibePlayerShortcutAction` and `useVibePlayerShortcuts` exist for provider-capability-aware keyboard handling
- `useVibePlayerChrome` exists with Discover-parity `2400ms` idle delay, show/hold/release/schedule actions, close reset, and timer cleanup
- playback-rate helpers exist with Discover-parity rates: `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`
- controls/timeline styles use the frozen 240ms chrome, 220ms scrim, 150ms timeline, focus ring, and reduced-motion behavior
- `package.json` publishes `src/styles/*.css` so the main stylesheet can import the split controls stylesheet safely
- `VibePlayerInline` is now the first direct-file assembly: it loads the source, mounts the adapter target, wires controls, captions, chrome, shortcuts, and controller commands
- shared `VibePlayerStage` owns reusable player runtime, controls, captions, chrome, shortcuts, and controller command wiring
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

Reference inputs:

- `discover-ui-motion.ts`
- `discover-video-player.tsx`
- `discover-player-overlay.tsx`
- `use-discover-overlay-presence.ts`
- `discover-caption-overlay.tsx`
- `discover-seek-control.tsx`

### Phase 5 — HLS adapter

Status: complete for the current HLS VOD/live capability scope.

Goal: support `.m3u8` playback cleanly.

Required work:

- implement HLS adapter
- use native HLS where available
- use `hls.js` fallback where needed
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
- adapter uses native HLS when `HTMLVideoElement.canPlayType()` reports HLS support
- adapter uses a managed `hls.js` fallback when native HLS is unavailable and MediaSource support exists
- `hls.js` is loaded through dynamic `import("hls.js")` only on managed HLS load, and `bun run build` keeps it out of the main package bundle with `--deps.never-bundle hls.js`
- adapter normalizes HLS manifest ready, level loaded, native media events, and HLS errors into the existing adapter event contract
- VOD HLS exposes seek and duration; live HLS disables seek and duration support honestly
- managed HLS sessions are destroyed on unmount and before adapter reload
- native file and HLS adapters share `src/adapters/native-video-dom.ts` for event binding, video metadata, caption track disabling, and snapshot logic
- `demo/phase5-hls-runtime.html` imports the built package and maps `hls.js` through an import map for browser runtime QA

Remaining:

- no quality-selection UI exists yet, so `supportsQualitySelection` remains false
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

### Phase 6 — YouTube adapter

Status: complete for the current YouTube iframe playback scope.

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
- `createYouTubeAdapter` exists in `src/adapters/create-youtube-adapter.ts`
- `createVibePlayerAdapter` selects the YouTube adapter for `type: "youtube"` sources
- YouTube iframe API loading is isolated in `src/adapters/youtube-iframe-runtime.ts`
- YouTube iframe API handle/session/event contract types live in `src/adapters/youtube-iframe-types.ts`
- YouTube capability and snapshot truth lives in `src/adapters/youtube-adapter-state.ts`
- adapter uses the official YouTube iframe API model: load `https://www.youtube.com/iframe_api`, create `YT.Player`, listen to `onReady`, `onStateChange`, `onPlaybackRateChange`, and `onError`, and call `playVideo`, `pauseVideo`, `seekTo`, `setPlaybackRate`, `setVolume`, `mute`, `unMute`, `getDuration`, `getCurrentTime`, and `destroy`
- adapter supports `startSeconds` through iframe `playerVars.start`
- adapter normalizes YouTube playing, paused, ended, rate, volume, error, and sampled `timeupdate` events into the existing adapter event contract
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
- `VibePlayerBackgroundLayer` exists and owns per-layer poster rendering, muted loop playback, first-frame readiness, reduced-motion pause behavior, and best-effort autoplay
- `VibePlayerAmbientPreview` exists as a higher-level wrapper with optional `onActivate` and accessible `activateLabel` for preview-to-player handoff patterns
- crossfade behavior preserves the Discovery reference values: `260ms cubic-bezier(0.645, 0.045, 0.355, 1)`, visible scale `1.006`, hidden scale `1.012`, and `300ms` retire delay
- frame-ready fallback timeout remains `2500ms`
- poster fallback is always visible immediately on first render; video fades in only after a renderable frame or fallback readiness
- layer state keeps at most two entries so the previous loop can stay visible while the next loop prepares
- preview video pauses for reduced-motion viewers and when `paused` is true
- preview resumes best-effort when visible/intersecting and motion is allowed
- preview CSS lives in `src/styles/vibe-player-preview.css` and is imported by the package stylesheet
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
- native Picture-in-Picture is now enabled for file and HLS playback through adapter capabilities, package controls, and `VibePlayerStage` command wiring; unsupported browsers and YouTube keep `canPictureInPicture: false`
- Discover telemetry now ignores package `opened` events because Discover already records `opened` from its own overlay lifecycle

Remaining:

- continue live visual QA on the user-managed `http://localhost:3001/discover/jeff-weinstein` route until human-click video start, controls, captions, resume, completion telemetry, close/reopen, and route navigation are all proven
- fix the Jeff Weinstein full-video asset/CDN path: the MP4 is about 670 MiB and has `moov` after `mdat`, so it should be remuxed with `ffmpeg -movflags +faststart` or replaced with HLS/renditions; Cloudflare range probes for the large full video are dynamic/bypass rather than a reliable edge hit
- align production CORS before using `crossOrigin` for full-video playback; localhost returned CORS headers, but `https://spreadu.com` and `https://www.spreadu.com` did not during this pass
- the local `file:../../../vibe-player` dependency is acceptable for the private integration pass but should be converted to a release/workspace policy before externalization
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
- 2026-06-09 01:00 CEST: full package `bun run ci` passed after icon-only controls split with 22 test files and 75 tests; `publint` reported all good and `attw` passed the ESM-only profile
- 2026-06-09 01:00 CEST: `bun install` in `/Users/tomrobak/_projects_/spreadoo` refreshed the local package cache after the icon controls build; target Spreadoo Discover tests passed again with 4 tests
- 2026-06-09 01:01 CEST: browser QA on `http://localhost:3001/discover/jeff-weinstein?vibePlayerCleanup=1` confirmed the overlay controls render icon-only package buttons with `aria-label`, hover `title`, empty text content, and SVG icons for Close, Pause, Unmute, Hide captions, Full screen, and Picture in picture; closing the overlay removed the dialog and stage video, leaving only the muted background video

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

Verification:

- 2026-06-09 00:45 CEST: full package `bun run ci` passed: `bun run check`, `bun run check-types`, full Vitest suite with 21 files and 70 tests, `bun run build`, `package:publint`, and `package:attw`
- 2026-06-09 00:45 CEST: `publint run --strict --pack npm` reported `All good!`
- 2026-06-09 00:45 CEST: `attw . --pack --profile esm-only --exclude-entrypoints ./styles.css` passed for ESM and bundler consumers; the CJS resolution warning is intentionally ignored by the ESM-only profile

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
2. Do we want the first exported skin to be branded-default or purely neutral-cinematic?
3. Should ambient background preview be part of the initial package release, or released one phase later?
4. Resolved 2026-06-09: no default persistence is enabled by player assemblies; v1 provides opt-in memory/localStorage resume store helpers and keeps the host responsible for passing `resumeStore`.
5. Do we want quality selection in v1 HLS UI, or only normalized playback?

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
