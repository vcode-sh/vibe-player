export const requiredPublicSymbols = [
  "VibePlayerStage",
  "VibePlayerStageProps",
  "VibePlayerSource",
  "VibePlayerAnalyticsEvent",
  "VibePlayerResumeStore",
  "createFileAdapter",
  "createHlsAdapter",
  "createYouTubeExternalAdapter",
  "createYouTubeAdapter",
  "createVibePlayerYouTubeWatchUrl",
  "VibePlayerBackgroundPreview",
  "VibePlayerAmbientPreview",
  "cinematicDefaultSkin",
  "VibePlayerSkinPreset",
  "VibePlayerStageStatus",
  "VibePlayerStageStatusProps",
  "VibePlayerVolumeControl",
  "VibePlayerVolumeState",
  "VibePlayerVolumeStateInput",
  "VibePlayerQualityOption",
  "createVibePlayerVolumeState",
  "clampVibePlayerVolume",
  "getVibePlayerVolumePercent",
  "getSelectedVibePlayerQualityOption",
  "canRenderVibePlayerQualityOptions",
];

export const forbiddenPublicSymbols = [
  "playGuardedNativeVideo",
  "PlayGuardedNativeVideoInput",
  "VibePlayerAdapterListener",
  "HlsAdapterQualityState",
  "HlsAdapterLoadSession",
  "createHlsAdapterQualityState",
  "MutableHlsAdapterQualityState",
  "LoadCurrentHlsAdapterSourceInput",
  "loadCurrentHlsAdapterSource",
  "TestStageAdapter",
  "StageAdapterFactoryHarness",
  "createStageAdapterFactory",
  "stageFileSource",
  "getStageMediaElement",
  "previewSource",
  "installPreviewBrowserMocks",
  "restorePreviewBrowserMocks",
  "pauseMock",
  "playMock",
  "DeferredPlayback",
  "createDeferredPlayback",
  "createDeferredManagedHlsController",
  "createDeferredManagedHlsFailure",
  "defineNativeVideoNumberProperty",
  "DeferredManagedHlsFailure",
  "DeferredManagedHlsController",
  "getMountedNativeVideo",
  "TestAdapter",
  "ControllerHarness",
  "createControllerHarness",
  "createControllerWithAdapter",
  "createHlsRuntime",
  "createLoadedFileAdapter",
  "createSingleFileSource",
  "emptyFileSource",
  "fileSource",
  "getManagedSession",
  "hlsSource",
  "handleVibePlayerControllerPlay",
  "HandleVibePlayerControllerPlayInput",
  "handleVibePlayerControllerSeek",
  "HandleVibePlayerControllerSeekInput",
  "loadVibePlayerControllerSource",
  "LoadVibePlayerControllerSourceInput",
  "YouTubeAdapterCommandInput",
  "pauseYouTubeVideo",
  "playYouTubeVideo",
  "seekYouTubeVideo",
  "setYouTubeMuted",
  "setYouTubePlaybackRate",
  "setYouTubeVolume",
  "enterYouTubeFullscreen",
  "exitYouTubeFullscreen",
  "VibePlayerBackgroundLayer",
  "VibePlayerToggleButton",
];

function escapeRegExp(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasDeclarationSymbol(declaration, symbol) {
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_$])${escapeRegExp(symbol)}([^A-Za-z0-9_$]|$)`
  );
  return pattern.test(declaration);
}

function collectMissingSymbols(declaration, symbols) {
  const missingSymbols = [];
  for (const symbol of symbols) {
    if (!hasDeclarationSymbol(declaration, symbol)) {
      missingSymbols.push(symbol);
    }
  }
  return missingSymbols;
}

function collectLeakedSymbols(declaration, symbols) {
  const leakedSymbols = [];
  for (const symbol of symbols) {
    if (hasDeclarationSymbol(declaration, symbol)) {
      leakedSymbols.push(symbol);
    }
  }
  return leakedSymbols;
}

export function collectPublicSurfaceIssues(declaration) {
  return {
    leakedSymbols: collectLeakedSymbols(declaration, forbiddenPublicSymbols),
    missingSymbols: collectMissingSymbols(declaration, requiredPublicSymbols),
  };
}
