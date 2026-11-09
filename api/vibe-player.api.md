# vibe-player API report

Generated from the built declarations by `bun run package:api:update`.
Do not edit by hand. Review every change before a release.

## Entry points

### vibe-player

```text
type CinematicDefaultCaptionTokens
type CinematicDefaultChromeTokens
type CinematicDefaultModalTokens
type CinematicDefaultMotionTokens
type CinematicDefaultShellTokens
type CinematicDefaultSkinTokens
type CinematicDefaultTimelineTokens
type HlsAdapterErrorPayload
type HlsAdapterOptions
type HlsAdapterRuntime
type HlsModuleLoader
type ManagedHlsController
type ManagedHlsLevel
type ManagedHlsSession
type ShouldRestoreVibePlayerResumePositionInput
type UseVibePlayerAudioFocusOptions
type UseVibePlayerCaptionsOptions
type UseVibePlayerChromeOptions
type UseVibePlayerControllerOptions
type UseVibePlayerMediaSessionOptions
type UseVibePlayerOptions
type UseVibePlayerShortcutsOptions
value VIBE_PLAYER_CHROME_IDLE_DELAY_MS
value VIBE_PLAYER_OVERLAY_EXIT_MS
type VibePlayerAdapter
type VibePlayerAdapterEvent
type VibePlayerAdapterOptions
value VibePlayerAmbientPreview
type VibePlayerAmbientPreviewProps
type VibePlayerAmbientPreviewSource
type VibePlayerAnalyticsEvent
type VibePlayerAnalyticsEventName
type VibePlayerAudioFocusBinding
type VibePlayerAudioFocusParticipant
value VibePlayerBackgroundPreview
type VibePlayerBackgroundPreviewProps
type VibePlayerCapabilities
type VibePlayerCaptionCue
value VibePlayerCaptionOverlay
type VibePlayerCaptionOverlayProps
type VibePlayerCaptionStatus
type VibePlayerCaptionTextLoader
type VibePlayerCaptionTrack
type VibePlayerCaptionsState
type VibePlayerChromeState
type VibePlayerClassNames
type VibePlayerCommandErrorEvent
value VibePlayerCompact
type VibePlayerCompactControls
type VibePlayerCompactProps
type VibePlayerCompactSkin
type VibePlayerCompactSlots
value VibePlayerController
type VibePlayerControllerOptions
type VibePlayerControllerState
value VibePlayerControls
type VibePlayerControlsProps
type VibePlayerError
type VibePlayerErrorKind
type VibePlayerEvent
type VibePlayerEventName
type VibePlayerEventOfType
type VibePlayerEventType
type VibePlayerFileSource
type VibePlayerGestures
value VibePlayerHeadless
type VibePlayerHeadlessProps
type VibePlayerHeadlessVideoProps
value VibePlayerHeatmap
type VibePlayerHeatmapProps
type VibePlayerHlsManifestSource
type VibePlayerHlsSource
type VibePlayerHlsUrlSource
value VibePlayerHostFrame
type VibePlayerHostFrameProps
type VibePlayerIconProps
type VibePlayerIcons
value VibePlayerInline
type VibePlayerInlineProps
type VibePlayerIntegrationEvent
type VibePlayerLabels
type VibePlayerLoadMode
type VibePlayerLocalStorageResumeStoreOptions
type VibePlayerMediaSessionArtwork
type VibePlayerMediaSessionMetadata
type VibePlayerMediaSessionOptions
type VibePlayerMediaSource
type VibePlayerMemoryResumeStoreOptions
value VibePlayerModal
type VibePlayerModalProps
type VibePlayerMp4Source
type VibePlayerOverlayPresence
type VibePlayerOverlayPresenceState
type VibePlayerPlaybackEvent
type VibePlayerPlaybackOptions
type VibePlayerProgressEventName
type VibePlayerProgressMilestone
value VibePlayerQualityControl
type VibePlayerQualityControlProps
type VibePlayerQualityOption
type VibePlayerRenewEvent
type VibePlayerResumeContext
type VibePlayerResumeStorage
type VibePlayerResumeStore
value VibePlayerScrubber
type VibePlayerScrubberProps
type VibePlayerSeekThumbnail
type VibePlayerSeekThumbnailGrid
type VibePlayerSeekThumbnailSprite
value VibePlayerShell
type VibePlayerShellProps
type VibePlayerShortcutAction
type VibePlayerShortcutInput
type VibePlayerShortcutOptions
type VibePlayerSkinClassNames
type VibePlayerSkinColorScheme
type VibePlayerSkinIntent
type VibePlayerSkinMetadata
type VibePlayerSkinPreset
type VibePlayerSnapshot
type VibePlayerSource
type VibePlayerSourceMetadata
value VibePlayerStage
type VibePlayerStageControls
type VibePlayerStageProps
value VibePlayerStageStatus
type VibePlayerStageStatusProps
type VibePlayerStopEvent
type VibePlayerSurface
type VibePlayerSurfaceActions
type VibePlayerSurfacePhase
type VibePlayerSurfaceState
value VibePlayerTimeline
type VibePlayerTimelineBackground
type VibePlayerTimelineBackgroundContext
type VibePlayerTimelinePreview
type VibePlayerTimelineProps
type VibePlayerUIOptions
type VibePlayerVariant
type VibePlayerVisibilityOptions
value VibePlayerVolumeControl
type VibePlayerVolumeControlProps
type VibePlayerVolumeState
type VibePlayerVolumeStateInput
type VibePlayerWatchedRange
type VibePlayerWatchedRangesReason
type VibePlayerWatchedRangesReport
value canRenderVibePlayerQualityOptions
value cinematicDefaultMotion
value cinematicDefaultSkin
value cinematicDefaultSkinClassNames
value cinematicDefaultSkinTokens
value clampVibePlayerTime
value clampVibePlayerVolume
value createFileAdapter
value createHlsAdapter
value createIdleCapabilities
value createIdleSnapshot
value createLocalStorageVibePlayerResumeStore
value createMemoryVibePlayerResumeStore
value createVibePlayerAdapter
value createVibePlayerAudioFocusParticipant
value createVibePlayerSeekThumbnails
value createVibePlayerVolumeState
value formatVibePlayerPlaybackRate
value formatVibePlayerTime
value getActiveVibePlayerCaptionLines
value getFiniteVibePlayerDuration
value getNextVibePlayerPlaybackRate
value getSelectedVibePlayerQualityOption
value getVibePlayerProgressMilestone
value getVibePlayerShortcutAction
value getVibePlayerVolumePercent
value parseVibePlayerSeekThumbnailsVtt
value parseWebVtt
value shouldRestoreVibePlayerResumePosition
value shouldRevealVibePlayerChromeForKey
value useVibePlayer
value useVibePlayerAudioFocus
value useVibePlayerCaptions
value useVibePlayerChrome
value useVibePlayerController
value useVibePlayerOverlayPresence
value useVibePlayerShortcuts
value vibePlayerPlaybackRates
```

### vibe-player/compact

```text
type VibePlayerClassNames
type VibePlayerCommandErrorEvent
value VibePlayerCompact
type VibePlayerCompactControls
type VibePlayerCompactProps
type VibePlayerCompactSkin
type VibePlayerCompactSlots
type VibePlayerController
type VibePlayerControllerState
type VibePlayerError
type VibePlayerErrorKind
type VibePlayerEvent
type VibePlayerGestures
value VibePlayerHeadless
type VibePlayerHeadlessProps
type VibePlayerHeadlessVideoProps
value VibePlayerHeatmap
type VibePlayerHeatmapProps
type VibePlayerHlsSource
value VibePlayerHostFrame
type VibePlayerHostFrameProps
type VibePlayerIconProps
type VibePlayerIcons
type VibePlayerLabels
type VibePlayerLoadMode
type VibePlayerMp4Source
value VibePlayerScrubber
type VibePlayerScrubberProps
type VibePlayerSeekThumbnail
type VibePlayerSeekThumbnailGrid
type VibePlayerSeekThumbnailSprite
type VibePlayerSnapshot
type VibePlayerSource
type VibePlayerSurface
type VibePlayerSurfaceActions
type VibePlayerSurfacePhase
type VibePlayerSurfaceState
type VibePlayerTimelineBackground
type VibePlayerTimelineBackgroundContext
type VibePlayerTimelinePreview
type VibePlayerUIOptions
type VibePlayerVariant
value createVibePlayerSeekThumbnails
value parseVibePlayerSeekThumbnailsVtt
```

### vibe-player/hook

```text
type HlsAdapterOptions
type HlsAdapterRuntime
type HlsModuleLoader
type UseVibePlayerAudioFocusOptions
type UseVibePlayerControllerOptions
type UseVibePlayerMediaSessionOptions
type UseVibePlayerOptions
type VibePlayerAdapterOptions
type VibePlayerAudioFocusBinding
type VibePlayerAudioFocusParticipant
type VibePlayerCommandErrorEvent
value VibePlayerController
type VibePlayerControllerOptions
type VibePlayerControllerState
type VibePlayerError
type VibePlayerErrorKind
type VibePlayerEvent
type VibePlayerEventOfType
type VibePlayerEventType
type VibePlayerHlsManifestSource
type VibePlayerHlsSource
type VibePlayerHlsUrlSource
type VibePlayerIntegrationEvent
type VibePlayerLoadMode
type VibePlayerMediaSessionArtwork
type VibePlayerMediaSessionMetadata
type VibePlayerMediaSessionOptions
type VibePlayerMp4Source
type VibePlayerPlaybackEvent
type VibePlayerRenewEvent
type VibePlayerResumeContext
type VibePlayerResumeStore
type VibePlayerSnapshot
type VibePlayerSource
type VibePlayerSourceMetadata
type VibePlayerStopEvent
type VibePlayerVisibilityOptions
type VibePlayerWatchedRange
type VibePlayerWatchedRangesReason
type VibePlayerWatchedRangesReport
value createLocalStorageVibePlayerResumeStore
value createMemoryVibePlayerResumeStore
value createVibePlayerAudioFocusParticipant
value formatVibePlayerTime
value useVibePlayer
value useVibePlayerAudioFocus
value useVibePlayerController
```

### vibe-player/stage

```text
type VibePlayerClassNames
type VibePlayerCommandErrorEvent
type VibePlayerController
type VibePlayerControllerState
type VibePlayerError
type VibePlayerErrorKind
type VibePlayerEvent
type VibePlayerGestures
value VibePlayerHeadless
type VibePlayerHeadlessProps
type VibePlayerHeadlessVideoProps
value VibePlayerHeatmap
type VibePlayerHeatmapProps
type VibePlayerHlsSource
type VibePlayerIconProps
type VibePlayerIcons
value VibePlayerInline
type VibePlayerInlineProps
type VibePlayerLabels
type VibePlayerLoadMode
value VibePlayerModal
type VibePlayerModalProps
type VibePlayerMp4Source
type VibePlayerPlaybackOptions
type VibePlayerSeekThumbnail
type VibePlayerSeekThumbnailGrid
type VibePlayerSeekThumbnailSprite
type VibePlayerSnapshot
type VibePlayerSource
value VibePlayerStage
type VibePlayerStageControls
type VibePlayerStageProps
type VibePlayerTimelineBackground
type VibePlayerTimelineBackgroundContext
type VibePlayerTimelinePreview
type VibePlayerUIOptions
type VibePlayerVariant
value createVibePlayerSeekThumbnails
value parseVibePlayerSeekThumbnailsVtt
```

## Public declarations

```ts
interface CinematicDefaultCaptionTokens {
  bottomMobileRem: number;
  bottomWideRem: number;
  chipBackground: string;
  chipRadiusPx: number;
  chipShadow: string;
  fontSizeMobilePx: number;
  fontSizeWidePx: number;
  maxWidth: string;
}

interface CinematicDefaultChromeTokens {
  buttonSizeRem: number;
  hiddenOffsetRem: number;
  idleDelayMs: number;
  scrimBackground: string;
  scrimDurationMs: number;
  scrimHeightRem: number;
  transitionDurationMs: number;
}

interface CinematicDefaultModalTokens {
  backdropBlurPx: number;
  backdropOpacity: number;
  backdropScaleClosed: number;
  backdropScaleOpen: number;
  background: string;
  gradient: string;
  panelPadding: string;
  shellWidth: string;
  wash: string;
}

interface CinematicDefaultMotionTokens {
  actionHoverMs: number;
  easeEmphasized: string;
  easeExit: string;
  mediaHoverMs: number;
  overlayInMs: number;
  overlayOutMs: number;
  reducedMotionQuery: string;
  surfaceHoverMs: number;
  textHoverMs: number;
}

interface CinematicDefaultShellTokens {
  background: string;
  border: string;
  radiusPx: number;
  shadow: string;
}

interface CinematicDefaultSkinTokens {
  caption: CinematicDefaultCaptionTokens;
  chrome: CinematicDefaultChromeTokens;
  modal: CinematicDefaultModalTokens;
  motion: CinematicDefaultMotionTokens;
  shell: CinematicDefaultShellTokens;
  timeline: CinematicDefaultTimelineTokens;
}

interface CinematicDefaultTimelineTokens {
  focusDurationMs: number;
  ghostSizeRem: number;
  hitAreaRem: number;
  pointSizeRem: number;
  railHeightPx: number;
  tooltipClampMaxPct: number;
  tooltipClampMinPct: number;
}

interface HlsAdapterErrorPayload extends Record<string, boolean | number | string | undefined> {
  credentialFailure?: boolean;
  details: string;
  fatal: boolean;
  kind?: VibePlayerErrorKind;
  message: string;
  network?: boolean;
  sdkFatal?: boolean;
  status?: number;
  type: string;
}

interface HlsAdapterOptions {
  hlsConfig?: Partial<HlsConfig> | undefined;
  hlsRuntime?: HlsAdapterRuntime | undefined;
  loadHls?: HlsModuleLoader | undefined;
}

interface HlsAdapterRuntime {
  attachManagedHls(session: ManagedHlsSession): ManagedHlsController | Promise<ManagedHlsController>;
  canUseManagedHls(video?: HTMLVideoElement): boolean;
}

type HlsModuleLoader = () => Promise<{
  default: typeof Hls;
}>;

interface ManagedHlsController {
  destroy(): void;
  setQualityLevel(levelIndex: number): void;
}

interface ManagedHlsLevel {
  bitrate: number;
  height: number;
  name?: string | undefined;
  width?: number | undefined;
}

interface ManagedHlsSession {
  isActive?: (() => boolean) | undefined;
  manifestUrl: string;
  onError: (payload: HlsAdapterErrorPayload) => void;
  onLevelLoaded: (isLive: boolean) => void;
  onLevelsChanged: (levels: ManagedHlsLevel[], selectedLevelIndex: number) => void;
  onReady: () => void;
  video: HTMLVideoElement;
}

interface ShouldRestoreVibePlayerResumePositionInput {
  canSeek: boolean;
  duration: number;
  isCurrentOperation: boolean;
  resumeTime: number | null | undefined;
}

interface UseVibePlayerAudioFocusOptions {
  group?: string | false | undefined;
  onPause: () => void | Promise<void>;
}

interface UseVibePlayerCaptionsOptions {
  currentTime: number;
  enabled: boolean;
  loadCaptionText?: VibePlayerCaptionTextLoader;
  source: VibePlayerSource | null;
}

interface UseVibePlayerChromeOptions {
  autoHide?: boolean;
  idleDelayMs?: number;
  open: boolean;
  playing?: boolean;
}

interface UseVibePlayerControllerOptions extends VibePlayerAdapterOptions, Omit<VibePlayerControllerOptions, "adapterFactory" | "onAnalyticsEvent" | "onEnded" | "onError" | "onEvent" | "onPause" | "onPlay" | "onProgress" | "onQualityChange" | "onRenew" | "onWatchedRanges" | "renewSource" | "resumeStore"> {
  adapterFactory?: VibePlayerControllerOptions["adapterFactory"] | undefined;
  onAnalyticsEvent?: VibePlayerControllerOptions["onAnalyticsEvent"] | undefined;
  onEnded?: VibePlayerControllerOptions["onEnded"] | undefined;
  onError?: VibePlayerControllerOptions["onError"] | undefined;
  onEvent?: VibePlayerControllerOptions["onEvent"] | undefined;
  onPause?: VibePlayerControllerOptions["onPause"] | undefined;
  onPlay?: VibePlayerControllerOptions["onPlay"] | undefined;
  onProgress?: VibePlayerControllerOptions["onProgress"] | undefined;
  onQualityChange?: VibePlayerControllerOptions["onQualityChange"] | undefined;
  onRenew?: VibePlayerControllerOptions["onRenew"] | undefined;
  onWatchedRanges?: VibePlayerControllerOptions["onWatchedRanges"] | undefined;
  renewSource?: VibePlayerControllerOptions["renewSource"] | undefined;
  resumeStore?: VibePlayerControllerOptions["resumeStore"] | undefined;
}

interface UseVibePlayerMediaSessionOptions extends VibePlayerMediaSessionOptions {
  active?: boolean | undefined;
}

interface UseVibePlayerOptions extends UseVibePlayerControllerOptions, VibePlayerVisibilityOptions {
  audioFocus?: string | false | undefined;
  autoPlay?: boolean | undefined;
  autoPlayMutedBootstrap?: boolean | undefined;
  load?: VibePlayerLoadMode | undefined;
  mediaSession?: boolean | UseVibePlayerMediaSessionOptions | undefined;
  open?: boolean | undefined;
  presentationTarget?: HTMLElement | null | undefined;
  seekStep?: number | undefined;
  source: VibePlayerSource | null;
}

interface UseVibePlayerShortcutsOptions extends VibePlayerShortcutOptions {
  enabled: boolean;
  onShortcut: (action: VibePlayerShortcutAction) => void;
  target?: HTMLElement | Window | null;
}

declare const VIBE_PLAYER_CHROME_IDLE_DELAY_MS = 2400;

declare const VIBE_PLAYER_OVERLAY_EXIT_MS = 180;

interface VibePlayerAdapter {
  readonly capabilities: VibePlayerCapabilities;
  enterFullscreen?(): Promise<void>;
  enterPictureInPicture?(): Promise<void>;
  exitFullscreen?(): Promise<void>;
  exitPictureInPicture?(): Promise<void>;
  getSnapshot(): VibePlayerSnapshot;
  readonly kind: VibePlayerSource["type"];
  load(source: VibePlayerSource): Promise<void>;
  mount(target: HTMLElement, presentationTarget?: HTMLElement): Promise<void>;
  pause(): Promise<void>;
  play(): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  setMuted(value: boolean): Promise<void>;
  setPlaybackRate(value: number): Promise<void>;
  setQuality?(qualityId: string): Promise<void>;
  setVolume(value: number): Promise<void>;
  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void;
  unmount(): Promise<void>;
}

interface VibePlayerAdapterEvent {
  payload?: Record<string, string | number | boolean | null | undefined>;
  snapshot: VibePlayerSnapshot;
  type: VibePlayerEventName;
}

interface VibePlayerAdapterOptions extends HlsAdapterOptions {}

declare function VibePlayerAmbientPreview({ activateLabel, children, className, onActivate, paused, preserveKey, preservePreviousLayer, source, title }: VibePlayerAmbientPreviewProps): import("react").JSX.Element;

interface VibePlayerAmbientPreviewProps extends VibePlayerBackgroundPreviewProps {
  activateLabel?: string | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  onActivate?: (() => void) | undefined;
  title?: string | undefined;
}

interface VibePlayerAmbientPreviewSource {
  fallbackPosterUrl?: string | undefined;
  id?: string | undefined;
  posterUrl: string;
  previewVideoUrl?: string | undefined;
}

interface VibePlayerAnalyticsEvent {
  currentTime?: number;
  duration?: number;
  from?: number;
  initiator?: "controller" | "media";
  provider: VibePlayerSource["type"];
  sourceId: string;
  type: VibePlayerAnalyticsEventName;
}

type VibePlayerAnalyticsEventName = "closed" | "completed" | "error" | "opened" | "progress_25" | "progress_50" | "progress_75" | "seek" | "started";

interface VibePlayerAudioFocusBinding {
  claim(): void;
  release(): void;
}

interface VibePlayerAudioFocusParticipant {
  claim(): void;
  dispose(): void;
  release(): void;
}

declare function VibePlayerBackgroundPreview({ paused, preserveKey, preservePreviousLayer, source }: VibePlayerBackgroundPreviewProps): import("react").JSX.Element;

interface VibePlayerBackgroundPreviewProps {
  paused?: boolean | undefined;
  preserveKey?: string | undefined;
  preservePreviousLayer?: boolean | undefined;
  source: VibePlayerAmbientPreviewSource;
}

interface VibePlayerCapabilities {
  canFullscreen: boolean;
  canPictureInPicture: boolean;
  canSeek: boolean;
  canSetPlaybackRate: boolean;
  canShowCaptions: boolean;
  isLive: boolean;
  supportsDuration: boolean;
  supportsMute: boolean;
  supportsPlayback: boolean;
  supportsPoster: boolean;
  supportsQualitySelection: boolean;
  supportsVolumeControl: boolean;
}

interface VibePlayerCaptionCue {
  end: number;
  start: number;
  text: string;
}

declare function VibePlayerCaptionOverlay({ className, lines }: VibePlayerCaptionOverlayProps): import("react").JSX.Element | null;

interface VibePlayerCaptionOverlayProps {
  className?: string;
  lines: string[];
}

interface VibePlayerCaptionStatus {
  error: Error | null;
  loading: boolean;
  track: VibePlayerCaptionTrack | null;
}

type VibePlayerCaptionTextLoader = (track: VibePlayerCaptionTrack, signal: AbortSignal) => Promise<string>;

interface VibePlayerCaptionTrack {
  default?: boolean;
  id: string;
  kind: "captions" | "subtitles";
  label: string;
  language: string;
  url: string;
}

interface VibePlayerCaptionsState extends VibePlayerCaptionStatus {
  activeLines: string[];
  retry: () => void;
}

interface VibePlayerChromeState {
  chromeHidden: boolean;
  hideChrome: () => void;
  holdChrome: () => void;
  releaseChrome: () => void;
  scheduleChromeHide: () => void;
  showChrome: () => void;
}

interface VibePlayerClassNames {
  button?: string;
  captions?: string;
  controls?: string;
  duration?: string;
  error?: string;
  media?: string;
  playButton?: string;
  poster?: string;
  progress?: string;
  retry?: string;
  root?: string;
  status?: string;
  time?: string;
  unmute?: string;
}

interface VibePlayerCommandErrorEvent {
  command: string;
  error: VibePlayerError;
  source: VibePlayerSource;
  type: "commanderror";
}

declare function VibePlayerCompact({ host, ...props }: VibePlayerCompactProps): import("react").JSX.Element;

interface VibePlayerCompactControls {
  centerButton?: "always" | "except-paused" | undefined;
  fullscreen?: boolean | undefined;
  mute?: boolean | undefined;
  pictureInPicture?: boolean | undefined;
  seek?: boolean | undefined;
  skip?: boolean | undefined;
  time?: boolean | undefined;
}

interface VibePlayerCompactProps extends Omit<UseVibePlayerSurfaceOptions, "variant"> {
  host?: HTMLElement | null | undefined;
  renderOverlay?: ((surface: VibePlayerSurface) => ReactNode) | undefined;
  skin?: VibePlayerCompactSkin | undefined;
  slots?: VibePlayerCompactSlots | undefined;
  variant?: "compact" | "feed" | undefined;
}

type VibePlayerCompactSkin = "chips" | "glass";

interface VibePlayerCompactSlots {
  ended?: ((surface: VibePlayerSurface) => ReactNode) | null | undefined;
  error?: ((surface: VibePlayerSurface) => ReactNode) | null | undefined;
  idle?: ((surface: VibePlayerSurface) => ReactNode) | null | undefined;
}

declare class VibePlayerController {
  private readonly observers;
  private readonly actions;
  private readonly session;
  private readonly runtime;
  private readonly playback;
  private readonly poster;
  private readonly resume;
  private readonly watched;
  constructor(options: VibePlayerControllerOptions);
  getState(): VibePlayerControllerState;
  subscribe(listener: (state: VibePlayerControllerState) => void): () => void;
  on<K extends VibePlayerEventType | "*">(type: K, listener: (event: VibePlayerEventOfType<K>) => void): () => void;
  mount(target: HTMLElement, presentationTarget?: HTMLElement): Promise<void>;
  unmount(): Promise<void>;
  load(source: VibePlayerSource, mode?: VibePlayerLoadMode): Promise<void>;
  activate(): Promise<void>;
  play(): Promise<void>;
  renewPoster(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  retry(): Promise<void>;
  seek(seconds: number): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  flushWatchedRanges(reason?: "flush" | "hidden"): void;
  setMuted(value: boolean): Promise<void>;
  setVolume(value: number): Promise<void>;
  setPlaybackRate(value: number): Promise<void>;
  setQuality(value: string): Promise<void>;
  enterFullscreen(): Promise<void>;
  exitFullscreen(): Promise<void>;
  enterPictureInPicture(): Promise<void>;
  exitPictureInPicture(): Promise<void>;
  closeSource(): Promise<void>;
  teardown(): Promise<void>;
}

interface VibePlayerControllerOptions {
  adapterFactory: (source: VibePlayerSource) => VibePlayerAdapter | Promise<VibePlayerAdapter>;
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  onEnded?: (state: VibePlayerControllerState) => void;
  onError?: (error: VibePlayerError) => void;
  onEvent?: (event: VibePlayerEvent) => void;
  onPause?: (state: VibePlayerControllerState) => void;
  onPlay?: (state: VibePlayerControllerState) => void;
  onProgress?: (state: VibePlayerControllerState) => void;
  onQualityChange?: (state: VibePlayerControllerState) => void;
  onRenew?: (source: VibePlayerSource) => void;
  onWatchedRanges?: (report: VibePlayerWatchedRangesReport) => void;
  renewSource?: (() => Promise<VibePlayerSource>) | undefined;
  resumeStore?: VibePlayerResumeStore;
}

interface VibePlayerControllerState {
  capabilities: VibePlayerCapabilities | null;
  currentSource: VibePlayerSource | null;
  error: VibePlayerError | null;
  isMounted: boolean;
  lastEvent: VibePlayerEventName | null;
  playbackBlocked: boolean;
  renewing: boolean;
  snapshot: VibePlayerSnapshot;
}

declare function VibePlayerControls({ capabilities, captionsEnabled, chromeHidden, onClose, onSeek, onSetMuted, onSetPlaybackRate, onSetQuality, onSetVolume, onSkip, onToggleCaptions, onToggleFullscreen, onToggleMute, onTogglePictureInPicture, onTogglePlay, seekStep, seekThumbnails, snapshot, title, topActions }: VibePlayerControlsProps): import("react").JSX.Element;

interface VibePlayerControlsProps {
  capabilities: VibePlayerCapabilities;
  captionsEnabled?: boolean;
  chromeHidden?: boolean;
  onClose?: (() => void) | undefined;
  onSeek: (seconds: number) => void;
  onSetMuted?: ((muted: boolean) => void) | undefined;
  onSetPlaybackRate: (rate: number) => void;
  onSetQuality?: ((qualityId: string) => void) | undefined;
  onSetVolume?: ((volume: number) => void) | undefined;
  onSkip?: ((seconds: number) => void) | undefined;
  onToggleCaptions?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMute: () => void;
  onTogglePictureInPicture?: () => void;
  onTogglePlay: () => void;
  seekStep?: number | undefined;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
  snapshot: VibePlayerSnapshot;
  title?: string | undefined;
  topActions?: ReactNode;
}

interface VibePlayerError {
  cause?: unknown;
  details?: Readonly<VibePlayerAdapterEvent["payload"]>;
  kind: VibePlayerErrorKind;
  message: string;
  phase: "create" | "mount" | "load" | "playback" | "integration";
  provider: VibePlayerSource["type"];
  sourceId: string;
}

type VibePlayerErrorKind = "network" | "decode" | "source" | "unknown";

type VibePlayerEvent = VibePlayerPlaybackEvent | VibePlayerRenewEvent | VibePlayerIntegrationEvent | VibePlayerCommandErrorEvent | VibePlayerStopEvent;

type VibePlayerEventName = "buffering" | "captionschange" | "durationchange" | "ended" | "error" | "fullscreenchange" | "pictureinpicturechange" | "pause" | "play" | "playing" | "playblocked" | "qualitychange" | "ratechange" | "ready" | "seeked" | "seeking" | "timeupdate" | "volumechange";

type VibePlayerEventOfType<K extends VibePlayerEventType | "*"> = K extends "*" ? VibePlayerEvent : K extends VibePlayerEventName ? VibePlayerPlaybackEvent & {
  type: K;
} : Extract<VibePlayerEvent, {
  type: K;
}>;

type VibePlayerEventType = VibePlayerEvent["type"];

interface VibePlayerFileSource extends VibePlayerSourceMetadata {
  autoPlay?: boolean;
  captions?: readonly VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  posterUrl?: string | null;
  sources: readonly VibePlayerMediaSource[];
  title?: string;
  type: "file";
}

interface VibePlayerGestures {
  doubleTapSeek?: boolean | undefined;
}

declare function VibePlayerHeadless({ load, source, videoProps, ...props }: VibePlayerHeadlessProps): import("react").JSX.Element;

interface VibePlayerHeadlessProps extends Omit<VibePlayerStageProps, "source" | "variant" | "renewSource"> {
  renewSource?: (() => Promise<VibePlayerHeadlessProps["source"]>) | undefined;
  source: VibePlayerStageProps["source"];
  videoProps?: VibePlayerHeadlessVideoProps | undefined;
}

interface VibePlayerHeadlessVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, "autoPlay" | "children" | "poster" | "preload" | "src"> {
  "data-voice-player"?: string | undefined;
}

declare function VibePlayerHeatmap({ className, peaks, peakThreshold, values, variant }: VibePlayerHeatmapProps): import("react").JSX.Element | null;

interface VibePlayerHeatmapProps {
  className?: string | undefined;
  peaks?: readonly number[] | undefined;
  peakThreshold?: number | undefined;
  values: readonly number[];
  variant?: "curve" | "glide" | undefined;
}

interface VibePlayerHlsManifestSource extends VibePlayerHlsSourceBase {
  manifestUrl: string;
  url?: string;
}

type VibePlayerHlsSource = VibePlayerHlsUrlSource | VibePlayerHlsManifestSource;

interface VibePlayerHlsUrlSource extends VibePlayerHlsSourceBase {
  manifestUrl?: string;
  url: string;
}

declare function VibePlayerHostFrame({ children, host }: VibePlayerHostFrameProps): import("react").ReactPortal | null;

interface VibePlayerHostFrameProps {
  children: ReactNode;
  host: HTMLElement | null;
}

interface VibePlayerIconProps extends Pick<SVGProps<SVGSVGElement>, "aria-hidden" | "className" | "focusable"> {}

interface VibePlayerIcons {
  captions?: ComponentType<VibePlayerIconProps>;
  check?: ComponentType<VibePlayerIconProps>;
  chevronDown?: ComponentType<VibePlayerIconProps>;
  close?: ComponentType<VibePlayerIconProps>;
  fullscreenEnter?: ComponentType<VibePlayerIconProps>;
  fullscreenExit?: ComponentType<VibePlayerIconProps>;
  mute?: ComponentType<VibePlayerIconProps>;
  pause?: ComponentType<VibePlayerIconProps>;
  pictureInPicture?: ComponentType<VibePlayerIconProps>;
  play?: ComponentType<VibePlayerIconProps>;
  replay?: ComponentType<VibePlayerIconProps>;
  retry?: ComponentType<VibePlayerIconProps>;
  seekBackward?: ComponentType<VibePlayerIconProps>;
  seekForward?: ComponentType<VibePlayerIconProps>;
  settings?: ComponentType<VibePlayerIconProps>;
  unavailable?: ComponentType<VibePlayerIconProps>;
  volume?: ComponentType<VibePlayerIconProps>;
  volumeHigh?: ComponentType<VibePlayerIconProps>;
  volumeLow?: ComponentType<VibePlayerIconProps>;
}

declare function VibePlayerInline({ children, footer, header, load, source, title, ...playback }: VibePlayerInlineProps): import("react").JSX.Element;

interface VibePlayerInlineProps extends PropsWithChildren, VibePlayerPlaybackOptions {
  footer?: ReactNode;
  header?: ReactNode;
  source?: VibePlayerSource | null;
  title?: string;
}

interface VibePlayerIntegrationEvent {
  error: VibePlayerError;
  source: VibePlayerSource;
  type: "integrationerror";
}

interface VibePlayerLabels {
  adaptiveQuality: string;
  autoQuality: string;
  bitrate: (megabits: number) => string;
  buffering: string;
  captionsShortcut: string;
  captionsUnavailable: string;
  close: string;
  exitFullscreen: string;
  exitPictureInPicture: string;
  fixedQuality: string;
  fullscreen: string;
  fullscreenShortcut: string;
  hideCaptions: string;
  loading: string;
  manualQuality: string;
  mostReplayed: string;
  mute: string;
  muteShortcut: string;
  pause: string;
  pictureInPicture: string;
  play: string;
  playbackSpeed: string;
  playbackSpeedValue: (rate: string) => string;
  playShortcut: string;
  playToStart: string;
  quality: string;
  qualityValue: (quality: string) => string;
  replay: string;
  replayValue: (value: number) => string;
  retry: string;
  retryCaptions: string;
  seek: string;
  seekBackward?: (seconds: number) => string;
  seekForward?: (seconds: number) => string;
  seekOffset?: (seconds: number) => string;
  seekShortcut: string;
  seekValue: (time: string, duration: string) => string;
  showCaptions: string;
  unavailable: string;
  unmute: string;
  videoPlayer: string;
  videoPlayerTitle: (title: string) => string;
  volume: string;
  volumeTrigger: (action: string, percent: number) => string;
  volumeValue: (percent: number, muted: boolean) => string;
}

type VibePlayerLoadMode = "onPlay" | "eager" | "visible";

interface VibePlayerLocalStorageResumeStoreOptions {
  keyPrefix?: string;
  minDurationSeconds?: number;
  minPositionSeconds?: number;
  storage?: VibePlayerResumeStorage | null;
}

interface VibePlayerMediaSessionArtwork {
  sizes?: string | undefined;
  src: string;
  type?: string | undefined;
}

interface VibePlayerMediaSessionMetadata {
  album?: string | undefined;
  artist?: string | undefined;
  artwork?: readonly VibePlayerMediaSessionArtwork[] | undefined;
  title?: string | undefined;
}

interface VibePlayerMediaSessionOptions {
  metadata?: VibePlayerMediaSessionMetadata | undefined;
  onNextTrack?: (() => void) | undefined;
  onPreviousTrack?: (() => void) | undefined;
  pictureInPicture?: boolean | undefined;
  seekBackwardSeconds?: number | undefined;
  seekForwardSeconds?: number | undefined;
}

interface VibePlayerMediaSource {
  mimeType: string;
  url: string;
}

interface VibePlayerMemoryResumeStoreOptions {
  entries?: Readonly<Record<string, number>>;
  minDurationSeconds?: number;
  minPositionSeconds?: number;
}

declare function VibePlayerModal({ children, autoFocus, autoPlay, autoPlayMutedBootstrap, footer, header, onClose, open, source, title, ...playback }: VibePlayerModalProps): import("react").JSX.Element | null;

interface VibePlayerModalProps extends PropsWithChildren, VibePlayerPlaybackOptions {
  autoPlay?: boolean | undefined;
  autoPlayMutedBootstrap?: boolean | undefined;
  footer?: ReactNode;
  header?: ReactNode;
  onClose?: () => void;
  open: boolean;
  source?: VibePlayerSource | null;
  title?: string;
}

interface VibePlayerMp4Source extends VibePlayerSourceMetadata {
  autoPlay?: boolean;
  captions?: readonly VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  posterUrl?: string | null;
  title?: string;
  type: "mp4";
  url: string;
}

interface VibePlayerOverlayPresence {
  rendered: boolean;
  state: VibePlayerOverlayPresenceState;
}

type VibePlayerOverlayPresenceState = "closing" | "open";

interface VibePlayerPlaybackEvent extends VibePlayerAdapterEvent {
  source: VibePlayerSource;
}

interface VibePlayerPlaybackOptions extends Omit<UseVibePlayerOptions, "source" | "open" | "presentationTarget">, VibePlayerUIOptions {
  autoFocus?: boolean | undefined;
  autoHideControls?: boolean | undefined;
  className?: string | undefined;
  controllerRef?: Ref<VibePlayerController> | undefined;
  controls?: VibePlayerStageControls | undefined;
  controlsHideDelay?: number | undefined;
  fit?: "contain" | "cover" | undefined;
  gestures?: VibePlayerGestures | undefined;
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  maxRatio?: number | undefined;
  minRatio?: number | undefined;
  onCaptionStatusChange?: ((status: VibePlayerCaptionStatus) => void) | undefined;
  onStateChange?: ((state: VibePlayerControllerState) => void) | undefined;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
  style?: CSSProperties | undefined;
  topActions?: ReactNode;
  variant?: VibePlayerVariant | undefined;
}

type VibePlayerProgressEventName = "progress_25" | "progress_50" | "progress_75";

interface VibePlayerProgressMilestone {
  event: VibePlayerProgressEventName;
  progressPct: 25 | 50 | 75;
}

declare function VibePlayerQualityControl({ capabilities, onSetQuality, qualityOptions }: VibePlayerQualityControlProps): import("react").JSX.Element | null;

interface VibePlayerQualityControlProps {
  capabilities: VibePlayerCapabilities;
  onSetQuality: ((qualityId: string) => void) | undefined;
  qualityOptions: VibePlayerQualityOption[] | undefined;
}

interface VibePlayerQualityOption {
  auto: boolean;
  bitrate?: number;
  height?: number;
  id: string;
  label: string;
  selected: boolean;
}

interface VibePlayerRenewEvent {
  previousSource: VibePlayerSource;
  source: VibePlayerSource;
  type: "renew";
}

interface VibePlayerResumeContext {
  duration: number;
  reason: "close" | "hidden" | "pause" | "progress" | "seek";
}

interface VibePlayerResumeStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface VibePlayerResumeStore {
  clear(sourceId: string): void;
  get(sourceId: string): number | null;
  set(sourceId: string, seconds: number, context?: VibePlayerResumeContext): void;
}

declare function VibePlayerScrubber({ bubble, className, interactive, surface }: VibePlayerScrubberProps): import("react").JSX.Element;

interface VibePlayerScrubberProps {
  bubble?: ReactNode;
  className?: string | undefined;
  interactive?: boolean | undefined;
  surface: VibePlayerSurface;
}

interface VibePlayerSeekThumbnail {
  endTime: number;
  sprite?: VibePlayerSeekThumbnailSprite;
  startTime: number;
  url: string;
}

interface VibePlayerSeekThumbnailGrid {
  columns: number;
  count: number;
  duration?: number | undefined;
  height: number;
  interval: number;
  url: string;
  width: number;
}

interface VibePlayerSeekThumbnailSprite {
  height: number;
  width: number;
  x: number;
  y: number;
}

declare function VibePlayerShell({ children, footer, header, title }: VibePlayerShellProps): import("react").JSX.Element;

interface VibePlayerShellProps extends PropsWithChildren {
  footer?: ReactNode;
  header?: ReactNode;
  title?: string | undefined;
}

type VibePlayerShortcutAction = "fullscreen" | "seek-backward" | "seek-forward" | "toggle-captions" | "toggle-mute" | "toggle-play";

interface VibePlayerShortcutInput {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  targetIsContentEditable: boolean;
  targetTagName: string | null;
}

interface VibePlayerShortcutOptions {
  canFullscreen: boolean;
  canSeek: boolean;
  canShowCaptions: boolean;
  supportsMute: boolean;
}

interface VibePlayerSkinClassNames {
  ambientPreview: string;
  captionOverlay: string;
  modal: string;
  modalPanel: string;
  root: string;
  shell: string;
  stage: string;
}

type VibePlayerSkinColorScheme = "dark" | "light";

type VibePlayerSkinIntent = "neutral-cinematic" | "brand-cinematic" | "discovery-parity";

interface VibePlayerSkinMetadata {
  colorScheme: VibePlayerSkinColorScheme;
  id: string;
  intent: VibePlayerSkinIntent;
  label: string;
}

interface VibePlayerSkinPreset<TTokens> {
  classNames: VibePlayerSkinClassNames;
  metadata: VibePlayerSkinMetadata;
  tokens: TTokens;
}

interface VibePlayerSnapshot {
  bufferedPct?: number;
  currentTime: number;
  duration: number;
  isFullscreen?: boolean;
  isPictureInPicture?: boolean;
  muted: boolean;
  paused: boolean;
  playbackRate: number;
  playbackRates?: readonly number[];
  qualityOptions?: VibePlayerQualityOption[];
  readyState: "buffering" | "ended" | "error" | "idle" | "loading" | "playing" | "ready";
  videoHeight?: number;
  videoWidth?: number;
  volume: number;
}

type VibePlayerSource = VibePlayerFileSource | VibePlayerHlsSource | VibePlayerMp4Source;

interface VibePlayerSourceMetadata {
  durationSeconds?: number;
  expiresAt?: string | number;
  height?: number;
  width?: number;
}

declare function VibePlayerStage(props: VibePlayerStageProps): import("react").JSX.Element;

interface VibePlayerStageControls {
  skip?: boolean | undefined;
}

interface VibePlayerStageProps extends VibePlayerPlaybackOptions {
  onClose?: (() => void) | undefined;
  open?: boolean | undefined;
  source: VibePlayerSource;
  title?: string | undefined;
}

declare function VibePlayerStageStatus({ onRetry, playbackBlocked, snapshot }: VibePlayerStageStatusProps): import("react").JSX.Element | null;

interface VibePlayerStageStatusProps {
  onRetry?: (() => void) | undefined;
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

interface VibePlayerStopEvent {
  snapshot: VibePlayerSnapshot;
  source: VibePlayerSource;
  type: "stop";
}

interface VibePlayerSurface {
  actions: VibePlayerSurfaceActions;
  controls: Required<VibePlayerCompactControls>;
  state: VibePlayerSurfaceState;
}

interface VibePlayerSurfaceActions {
  hideControls(): void;
  pause(): void;
  play(): void;
  primary(): void;
  retry(): void;
  revealControls(): void;
  scrubEnd(commit?: boolean): void;
  scrubStart(): void;
  scrubTo(fraction: number): void;
  seekBy(seconds: number): void;
  setMuted(muted: boolean): void;
  toggleFullscreen(): void;
  toggleMute(): void;
  togglePictureInPicture(): void;
}

type VibePlayerSurfacePhase = "ended" | "error" | "idle" | "loading" | "paused" | "playing" | "renewing";

interface VibePlayerSurfaceState {
  autoplayMuted: boolean;
  busy: boolean;
  capabilities: VibePlayerCapabilities;
  controlsVisible: boolean;
  duration: number;
  error: VibePlayerError | null;
  hold: "keyboard-focus" | "phase" | "scrub" | null;
  muted: boolean;
  phase: VibePlayerSurfacePhase;
  pictureInPicture: boolean;
  previewTime: number | null;
  scrubbing: boolean;
  seekStep: number;
  time: number;
}

declare function VibePlayerTimeline({ currentTime, disabled, duration, onSeek, seekThumbnails }: VibePlayerTimelineProps): import("react").JSX.Element;

type VibePlayerTimelineBackground = (context: VibePlayerTimelineBackgroundContext) => ReactNode;

interface VibePlayerTimelineBackgroundContext {
  duration: number;
  preview: VibePlayerTimelinePreview;
  seekThumbnails: readonly VibePlayerSeekThumbnail[] | undefined;
}

interface VibePlayerTimelinePreview {
  readonly fraction: number | null;
  subscribe(listener: () => void): () => void;
}

interface VibePlayerTimelineProps {
  currentTime: number;
  disabled?: boolean;
  duration: number;
  onSeek: (seconds: number) => void;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
}

interface VibePlayerUIOptions {
  classNames?: VibePlayerClassNames | undefined;
  formatTime?: ((seconds: number) => string) | undefined;
  icons?: VibePlayerIcons | undefined;
  labels?: Partial<VibePlayerLabels> | undefined;
  timelineBackground?: VibePlayerTimelineBackground | undefined;
}

type VibePlayerVariant = "compact" | "feed" | "full";

interface VibePlayerVisibilityOptions {
  autoplayWhenVisible?: boolean | undefined;
  offscreenThreshold?: number | undefined;
  pauseWhenHidden?: boolean | undefined;
  stopWhenOffscreen?: boolean | undefined;
}

declare function VibePlayerVolumeControl({ capabilities, onSetMuted, onSetVolume, onToggleMute, snapshot }: VibePlayerVolumeControlProps): import("react").JSX.Element | null;

interface VibePlayerVolumeControlProps {
  capabilities: VibePlayerCapabilities;
  onSetMuted: ((muted: boolean) => void) | undefined;
  onSetVolume: ((volume: number) => void) | undefined;
  onToggleMute: () => void;
  snapshot: VibePlayerSnapshot;
}

interface VibePlayerVolumeState {
  muted: boolean;
  percent: number;
  silent: boolean;
  value: number;
  valueText: string;
}

interface VibePlayerVolumeStateInput {
  muted: boolean;
  volume: number;
}

interface VibePlayerWatchedRange {
  end: number;
  start: number;
}

type VibePlayerWatchedRangesReason = "close" | "ended" | "flush" | "hidden" | "limit" | "pause" | "reload" | "seek";

interface VibePlayerWatchedRangesReport {
  duration: number;
  playbackId: string;
  provider: VibePlayerSource["type"];
  ranges: readonly VibePlayerWatchedRange[];
  reason: VibePlayerWatchedRangesReason;
  sequence: number;
  sourceId: string;
}

declare function canRenderVibePlayerQualityOptions(capabilities: VibePlayerCapabilities, options: VibePlayerQualityOption[] | undefined): boolean;

declare const cinematicDefaultMotion: {
  readonly chromeHideDelayMs: number;
  readonly durationFastMs: number;
  readonly durationMediumMs: number;
  readonly durationSlowMs: 260;
  readonly easeEmphasized: string;
  readonly easeExit: string;
};

declare const cinematicDefaultSkin: VibePlayerSkinPreset<typeof cinematicDefaultSkinTokens>;

declare const cinematicDefaultSkinClassNames: {
  readonly ambientPreview: "vibe-player-ambient-preview";
  readonly captionOverlay: "vibe-player-caption-overlay";
  readonly modal: "vibe-player-modal";
  readonly modalPanel: "vibe-player-modal__panel";
  readonly panel: "vibe-player-modal__panel";
  readonly root: "vibe-player-skin--cinematic-default";
  readonly shell: "vibe-player-shell";
};

declare const cinematicDefaultSkinTokens: CinematicDefaultSkinTokens;

declare function clampVibePlayerTime(seconds: number, duration: number, isLive: boolean): number;

declare function clampVibePlayerVolume(value: number): number;

declare function createFileAdapter(): VibePlayerAdapter;

declare function createHlsAdapter(options?: HlsAdapterOptions | HlsAdapterRuntime): VibePlayerAdapter;

declare function createIdleCapabilities(): VibePlayerCapabilities;

declare function createIdleSnapshot(): VibePlayerSnapshot;

declare function createLocalStorageVibePlayerResumeStore(options?: VibePlayerLocalStorageResumeStoreOptions): VibePlayerResumeStore;

declare function createMemoryVibePlayerResumeStore(options?: VibePlayerMemoryResumeStoreOptions): VibePlayerResumeStore;

declare function createVibePlayerAdapter(source: VibePlayerSource, options?: VibePlayerAdapterOptions): VibePlayerAdapter;

declare function createVibePlayerAudioFocusParticipant(group: string, onPause: () => void | Promise<void>): VibePlayerAudioFocusParticipant;

declare function createVibePlayerSeekThumbnails({ columns, count, duration, height, interval, url, width }: VibePlayerSeekThumbnailGrid): VibePlayerSeekThumbnail[];

declare function createVibePlayerVolumeState({ muted, volume }: VibePlayerVolumeStateInput): VibePlayerVolumeState;

declare function formatVibePlayerPlaybackRate(rate: number): string;

declare function formatVibePlayerTime(seconds: number): string;

declare function getActiveVibePlayerCaptionLines(cues: VibePlayerCaptionCue[], currentTime: number): string[];

declare function getFiniteVibePlayerDuration(source: DurationSource, fallback: number | null): number;

declare function getNextVibePlayerPlaybackRate(currentRate: number, availableRates?: readonly number[]): number;

declare function getSelectedVibePlayerQualityOption(options: VibePlayerQualityOption[] | undefined): VibePlayerQualityOption | null;

declare function getVibePlayerProgressMilestone(percent: number, sentEvents: ReadonlySet<string>): VibePlayerProgressMilestone | null;

declare function getVibePlayerShortcutAction(input: VibePlayerShortcutInput, options: VibePlayerShortcutOptions): VibePlayerShortcutAction | null;

declare function getVibePlayerVolumePercent(value: number): number;

declare function parseVibePlayerSeekThumbnailsVtt(text: string, baseUrl?: string): VibePlayerSeekThumbnail[];

declare function parseWebVtt(content: string): VibePlayerCaptionCue[];

declare function shouldRestoreVibePlayerResumePosition({ canSeek, duration, isCurrentOperation, resumeTime }: ShouldRestoreVibePlayerResumePositionInput): boolean;

declare function shouldRevealVibePlayerChromeForKey(input: {
  chromeHidden: boolean;
  key: string;
}): boolean;

declare function useVibePlayer({ audioFocus, autoPlay, autoPlayMutedBootstrap, autoplayWhenVisible, load, mediaSession, offscreenThreshold, open, pauseWhenHidden, presentationTarget, seekStep, source: nextSource, stopWhenOffscreen, ...options }: UseVibePlayerOptions): {
  controller: VibePlayerController;
  state: VibePlayerControllerState;
  setTarget: import("react").Dispatch<import("react").SetStateAction<HTMLElement | null>>;
};

declare function useVibePlayerAudioFocus({ group, onPause }: UseVibePlayerAudioFocusOptions): VibePlayerAudioFocusBinding;

declare function useVibePlayerCaptions({ currentTime, enabled, loadCaptionText, source }: UseVibePlayerCaptionsOptions): VibePlayerCaptionsState;

declare function useVibePlayerChrome({ autoHide, idleDelayMs, open, playing }: UseVibePlayerChromeOptions): VibePlayerChromeState;

declare function useVibePlayerController(options?: UseVibePlayerControllerOptions): {
  controller: VibePlayerController;
  setTarget: (element: HTMLElement | null) => void;
  state: VibePlayerControllerState;
};

declare function useVibePlayerOverlayPresence(open: boolean, exitMs?: number): VibePlayerOverlayPresence;

declare function useVibePlayerShortcuts({ canFullscreen, canSeek, canShowCaptions, enabled, onShortcut, supportsMute, target }: UseVibePlayerShortcutsOptions): void;

declare const vibePlayerPlaybackRates: readonly [0.5, 0.75, 1, 1.25, 1.5, 2];
```

## Unexported declarations referenced by the public API

```ts
interface DurationSource {
  duration: number;
}

interface UseVibePlayerSurfaceOptions extends VibePlayerStageProps {
  controls?: VibePlayerCompactControls | undefined;
  onExpand?: (() => void) | undefined;
}

interface VibePlayerHlsSourceBase extends VibePlayerSourceMetadata {
  captions?: readonly VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  live?: boolean;
  posterUrl?: string | null;
  title?: string;
  type: "hls";
}
```
