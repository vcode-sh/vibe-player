import type { ReactNode } from "react";

export interface ShowcaseSectionMeta {
  id: string;
  /** Short name used in the page navigation. */
  nav: string;
  title: string;
}

interface ShowcaseSectionProps {
  /** Props and helpers the example uses, shown as code chips. */
  api: readonly string[];
  children: ReactNode;
  description: ReactNode;
  meta: ShowcaseSectionMeta;
  /** Extra notes under the description: support limits, how to observe. */
  notes?: ReactNode;
}

/** One feature: what it is, the API it uses, and a working example. */
export function ShowcaseSection({
  api,
  children,
  description,
  meta,
  notes,
}: ShowcaseSectionProps) {
  const headingId = `${meta.id}-heading`;
  return (
    <section aria-labelledby={headingId} className="sc-section" id={meta.id}>
      <header className="sc-section__intro">
        <h2 id={headingId}>{meta.title}</h2>
        <p className="sc-section__lede">{description}</p>
        <ul aria-label="API used" className="sc-api">
          {api.map((item) => (
            <li key={item}>
              <code>{item}</code>
            </li>
          ))}
        </ul>
        {notes ? <div className="sc-section__notes">{notes}</div> : null}
      </header>
      <div className="sc-section__demo">{children}</div>
    </section>
  );
}

interface ShowcaseCaptionProps {
  children: ReactNode;
  code: string;
}

/** The label under one example: what it shows and the exact prop. */
export function ShowcaseCaption({ children, code }: ShowcaseCaptionProps) {
  return (
    <p className="sc-caption">
      <span>{children}</span>
      <code>{code}</code>
    </p>
  );
}
