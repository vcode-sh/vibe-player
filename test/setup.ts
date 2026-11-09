import "@testing-library/jest-dom/vitest";

// Happy DOM omits the HTML media ready-state constants used by native adapters.
for (const [name, value] of Object.entries({
  HAVE_CURRENT_DATA: 2,
  HAVE_ENOUGH_DATA: 4,
  HAVE_FUTURE_DATA: 3,
  HAVE_METADATA: 1,
  HAVE_NOTHING: 0,
})) {
  if (!(name in HTMLMediaElement)) {
    Object.defineProperty(HTMLMediaElement, name, {
      configurable: true,
      value,
    });
  }
}
