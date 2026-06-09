/** Package-level skin intent used for host skin pickers and docs. */
export type VibePlayerSkinIntent =
  | "neutral-cinematic"
  | "brand-cinematic"
  | "discovery-parity";

/** Dominant color scheme expected by the skin's CSS tokens. */
export type VibePlayerSkinColorScheme = "dark" | "light";

/** Public metadata for a package skin preset. */
export interface VibePlayerSkinMetadata {
  colorScheme: VibePlayerSkinColorScheme;
  id: string;
  intent: VibePlayerSkinIntent;
  label: string;
}

/** Stable class names that host apps can use for scoped skin wrappers. */
export interface VibePlayerSkinClassNames {
  ambientPreview: string;
  captionOverlay: string;
  modal: string;
  modalPanel: string;
  root: string;
  shell: string;
  stage: string;
}

/** Typed skin preset that keeps metadata, classes, and tokens together. */
export interface VibePlayerSkinPreset<TTokens> {
  classNames: VibePlayerSkinClassNames;
  metadata: VibePlayerSkinMetadata;
  tokens: TTokens;
}
