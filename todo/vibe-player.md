# Vibe Player Plan

Status: in progress; standalone repo scaffold exists, Phase 0 is partly done, Phase 1 is partly implemented
Created: 2026-06-08 19:52 CEST
Last verified: 2026-06-08 21:01 CEST
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

Verified in `/Users/tomrobak/_projects_/vibe-player` on 2026-06-08 21:01 CEST:

- package scaffold exists in `package.json` for ESM build, typecheck, lint, Vitest, publint, and ATTW
- source union, capability model, normalized event names, adapter contract, resume seam, and analytics seam exist in `src/core/vibe-player-types.ts`
- controller skeleton exists in `src/core/vibe-player-controller.ts`
- progress milestone helper exists in `src/core/vibe-player-events.ts`
- time formatting, duration, clamp, idle snapshot, and idle capabilities helpers exist in `src/core/vibe-player-time.ts`
- React binding exists in `src/react/use-vibe-player-controller.ts`
- minimal inline, modal, and shell components exist in `src/ui`
- WebVTT parsing and active-caption lookup exist in `src/captions/parse-webvtt.ts`
- current tests cover progress milestones, time helpers, and WebVTT parsing
- no real file, HLS, or YouTube adapter exists yet
- no package-owned controls, timeline, caption overlay, idle chrome hook, shortcut hook, background preview, or Discovery-parity skin exists yet

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

Status: in progress.

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

Remaining:

- inspect the referenced Discover files and freeze exact motion constants, idle timings, shell geometry, and caption/timeline behavior
- write the v1 scope cut explicitly before implementing file playback or full UI

### Phase 1 — Headless core contract

Status: partly implemented.

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
- controller skeleton exists in `src/core/vibe-player-controller.ts`
- progress milestone helper exists in `src/core/vibe-player-events.ts`
- time helpers exist in `src/core/vibe-player-time.ts`

Remaining:

- add focused controller tests for mount, load, adapter swap, play, pause, seek, mute, rate, resume, analytics, and teardown
- decide whether progress milestone emission belongs in the controller or in a host/helper layer
- split core files if they approach the repo LOC limits

### Phase 2 — File adapter

Status: not started.

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

- no real file adapter exists yet
- WebVTT parsing exists in `src/captions/parse-webvtt.ts`

Reference inputs:

- `use-discover-video-player-state.ts`
- `discover-video-player.tsx`
- `use-discover-video-captions.ts`
- `discover-player-events.ts`
- `discover-player-time.ts`
- `discover-playback-rate.ts`

### Phase 3 — First cinematic UI skin

Status: scaffold only.

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

- minimal `VibePlayerInline`, `VibePlayerModal`, and `VibePlayerShell` components exist in `src/ui`
- no package-owned controls, timeline, caption overlay, backdrop, idle chrome, or shortcut binding exists yet

Reference inputs:

- `discover-video-controls.tsx`
- `discover-seek-control.tsx`
- `use-discover-player-chrome.ts`
- `discover-player-shortcuts.ts`
- `use-discover-player-shortcuts.ts`
- `discover-player-keyboard.ts`
- `discover-caption-overlay.tsx`

### Phase 4 — Discovery-parity skin/preset

Status: not started.

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

- `src/skins/cinematic-default/index.ts` exists as an initial skin export point
- no Discovery-parity skin or token file exists yet

Reference inputs:

- `discover-ui-motion.ts`
- `discover-video-player.tsx`
- `discover-player-overlay.tsx`
- `use-discover-overlay-presence.ts`
- `discover-caption-overlay.tsx`
- `discover-seek-control.tsx`

### Phase 5 — HLS adapter

Status: not started.

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
- no HLS runtime dependency is installed yet
- no HLS adapter exists yet

### Phase 6 — YouTube adapter

Status: not started.

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
- no YouTube iframe adapter exists yet

### Phase 7 — Ambient preview layer

Status: not started.

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

- no `src/preview` module exists yet

Reference inputs:

- `discover-background-video.tsx`
- `discover-media.ts`
- `discover-background-video.test.tsx`
- `discover-media.test.ts`

### Phase 8 — Discovery integration

Status: not started.

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

- no integration has started
- this must wait until file playback and the first package UI are usable

### Phase 9 — Externalization decision

Status: not started.

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

1. Do we want Picture-in-Picture in v1 for file playback, or leave it for a later phase?
2. Do we want the first exported skin to be branded-default or purely neutral-cinematic?
3. Should ambient background preview be part of the initial package release, or released one phase later?
4. Do we want localStorage resume as the default host implementation, or no default persistence?
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
