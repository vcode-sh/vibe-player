import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

const storageKey = "vibe-player-showcase:theme";
const themes: readonly Theme[] = ["system", "light", "dark"];
const themeLabels: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  system: "Auto",
};

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/** A remembered per-viewer preference; storage may be unavailable. */
function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function writeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // The choice still applies for this visit.
  }
}

/** Auto follows the system; Light and Dark pin `data-theme` on the page. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.dataset.theme = theme;
    }
    writeTheme(theme);
  }, [theme]);
  return (
    <fieldset className="sc-theme">
      <legend className="sc-visually-hidden">Color theme</legend>
      {themes.map((option) => (
        <button
          aria-pressed={option === theme}
          key={option}
          onClick={() => setTheme(option)}
          type="button"
        >
          {themeLabels[option]}
        </button>
      ))}
    </fieldset>
  );
}
