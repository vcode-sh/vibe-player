import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const declarationPath = resolve(import.meta.dirname, "../dist/index.d.ts");

const requiredSymbols = [
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
];

const forbiddenSymbols = [
  "playGuardedNativeVideo",
  "PlayGuardedNativeVideoInput",
  "VibePlayerAdapterListener",
  "HlsAdapterQualityState",
  "createHlsAdapterQualityState",
  "MutableHlsAdapterQualityState",
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
];

function collectMissingSymbols(declaration, symbols) {
  const missingSymbols = [];
  for (const symbol of symbols) {
    if (!declaration.includes(symbol)) {
      missingSymbols.push(symbol);
    }
  }
  return missingSymbols;
}

function collectLeakedSymbols(declaration, symbols) {
  const leakedSymbols = [];
  for (const symbol of symbols) {
    if (declaration.includes(symbol)) {
      leakedSymbols.push(symbol);
    }
  }
  return leakedSymbols;
}

function reportFailure(title, symbols) {
  console.error(title);
  for (const symbol of symbols) {
    console.error(`- ${symbol}`);
  }
}

const declaration = await readFile(declarationPath, "utf8");
const missingSymbols = collectMissingSymbols(declaration, requiredSymbols);
const leakedSymbols = collectLeakedSymbols(declaration, forbiddenSymbols);

if (missingSymbols.length > 0) {
  reportFailure(
    "Missing expected public symbols in dist/index.d.ts:",
    missingSymbols
  );
}

if (leakedSymbols.length > 0) {
  reportFailure(
    "Unexpected internal symbols leaked into dist/index.d.ts:",
    leakedSymbols
  );
}

if (missingSymbols.length > 0 || leakedSymbols.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Public declaration surface is clean.");
}
