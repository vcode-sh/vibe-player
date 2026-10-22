interface PosterOptions {
  accent: string;
  base: string;
  horizon: string;
  line: string;
}

/** Inline SVG poster so demo cards need no extra network assets. */
export function createPosterUrl({
  accent,
  base,
  horizon,
  line,
}: PosterOptions) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="${base}" />
      <path d="M0 500h1280v220H0z" fill="${horizon}" />
      <path d="M120 180h460l-96 360H24z" fill="${accent}" opacity=".86" />
      <path d="M760 128h360l120 412H640z" fill="${line}" opacity=".78" />
      <path d="M230 234h234M198 314h244M166 394h256" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".62" />
      <path d="M790 230h250M824 314h250M858 398h250" stroke="#050506" stroke-width="18" stroke-linecap="round" opacity=".52" />
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
