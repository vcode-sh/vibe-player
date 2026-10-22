interface BodyScrollLock {
  count: number;
  overflow: string;
  overflowPriority: string;
  padding: string;
  paddingPriority: string;
}

const locks = new WeakMap<HTMLElement, BodyScrollLock>();

/** Nested players share one scroll lock and restore the host's inline styles. */
export function lockVibePlayerModalScroll(document: Document): () => void {
  const { body, documentElement, defaultView } = document;
  const current = locks.get(body);
  if (current) {
    current.count += 1;
  } else {
    locks.set(body, {
      count: 1,
      overflow: body.style.getPropertyValue("overflow"),
      overflowPriority: body.style.getPropertyPriority("overflow"),
      padding: body.style.getPropertyValue("padding-right"),
      paddingPriority: body.style.getPropertyPriority("padding-right"),
    });
    const width = documentElement.clientWidth;
    const gap = defaultView && width > 0 ? defaultView.innerWidth - width : 0;
    if (gap > 0 && defaultView) {
      const padding =
        Number.parseFloat(defaultView.getComputedStyle(body).paddingRight) || 0;
      body.style.setProperty("padding-right", `${padding + gap}px`);
    }
    body.style.setProperty("overflow", "hidden");
  }
  let active = true;
  return () => {
    const lock = locks.get(body);
    if (!(active && lock)) {
      return;
    }
    active = false;
    lock.count -= 1;
    if (lock.count === 0) {
      body.style.setProperty("overflow", lock.overflow, lock.overflowPriority);
      body.style.setProperty(
        "padding-right",
        lock.padding,
        lock.paddingPriority
      );
      locks.delete(body);
    }
  };
}
