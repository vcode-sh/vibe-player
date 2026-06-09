import type { CSSProperties } from "react";

export interface SourceAccentStyle extends CSSProperties {
  "--source-accent": string;
}

export function createSourceAccentStyle(accent: string): SourceAccentStyle {
  return { "--source-accent": accent };
}
