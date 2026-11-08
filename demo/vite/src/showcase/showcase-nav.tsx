import { useEffect, useState } from "react";
import type { ShowcaseSectionMeta } from "./showcase-section";
import { ThemeSwitch } from "./theme-switch";

interface ShowcaseNavProps {
  sections: readonly ShowcaseSectionMeta[];
}

/** Tracks the section crossing the reading line with one observer. */
function useActiveSection(sections: readonly ShowcaseSectionMeta[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-35% 0px -60% 0px" }
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [sections]);
  return active;
}

/** Sticky page navigation: feature anchors, routes and the theme. */
export function ShowcaseNav({ sections }: ShowcaseNavProps) {
  const active = useActiveSection(sections);
  return (
    <header className="sc-bar">
      <a className="sc-brand" href="?">
        <span aria-hidden="true" className="sc-brand__mark">
          VP
        </span>
        <span>vibe-player</span>
      </a>
      <nav aria-label="Features" className="sc-bar__sections">
        {sections.map((section) => (
          <a
            aria-current={section.id === active ? "true" : undefined}
            href={`#${section.id}`}
            key={section.id}
          >
            {section.nav}
          </a>
        ))}
      </nav>
      <div className="sc-bar__end">
        <a className="sc-bar__route" href="?demo=workbench">
          Providers
        </a>
        <ThemeSwitch />
      </div>
    </header>
  );
}
