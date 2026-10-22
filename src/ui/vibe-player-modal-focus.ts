const focusableSelector = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  "summary",
  '[contenteditable]:not([contenteditable="false"])',
  "[tabindex]",
].join(",");

function isTabbable(element: HTMLElement): boolean {
  const editableRoot =
    element.isContentEditable &&
    !element.hasAttribute("tabindex") &&
    !element.parentElement?.isContentEditable;
  return (
    (element.tabIndex >= 0 || editableRoot) &&
    !element.matches(":disabled") &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    element.checkVisibility({ checkVisibilityCSS: true })
  );
}

function tabOrder(element: HTMLElement): number {
  return element.tabIndex > 0 ? element.tabIndex : Number.MAX_SAFE_INTEGER;
}

function getTabbableElements(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(isTabbable)
    .sort((left, right) => tabOrder(left) - tabOrder(right));
}

function getFallback(dialog: HTMLDialogElement): HTMLElement {
  return (
    dialog.querySelector<HTMLElement>(".vibe-player-modal__frame") ?? dialog
  );
}

export function focusVibePlayerModalContent(dialog: HTMLDialogElement): void {
  if (dialog.contains(dialog.ownerDocument.activeElement)) {
    return;
  }
  const initial = getTabbableElements(dialog)[0] ?? getFallback(dialog);
  initial.focus({ preventScroll: true });
}

/** Browsers can send Tab to browser chrome even while a native dialog is modal. */
export function wrapVibePlayerModalTabFocus(
  dialog: HTMLDialogElement,
  backwards: boolean
): boolean {
  const elements = getTabbableElements(dialog);
  const [first] = elements;
  const last = elements.at(-1);
  const active = dialog.ownerDocument.activeElement;
  const index = active instanceof HTMLElement ? elements.indexOf(active) : -1;
  let target: HTMLElement | undefined;
  if (elements.length === 0) {
    target = getFallback(dialog);
  } else if (index < 0) {
    target = backwards ? last : first;
  } else if (backwards && index === 0) {
    target = last;
  } else if (!backwards && index === elements.length - 1) {
    target = first;
  }
  if (!target) {
    return false;
  }
  target.focus({ preventScroll: true });
  return true;
}
