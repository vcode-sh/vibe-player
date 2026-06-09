import {
  type FocusEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export interface VibePlayerTooltipProps {
  align?: "center" | "end" | "start" | undefined;
  children: ReactNode;
  disabled?: boolean | undefined;
  label: string;
  shortcut?: string | undefined;
}

export function VibePlayerTooltip({
  align = "center",
  children,
  disabled = false,
  label,
  shortcut,
}: VibePlayerTooltipProps) {
  const tooltipId = useId();
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [collisionOffset, setCollisionOffset] = useState(0);
  const [visible, setVisible] = useState(false);
  const shown = visible && !disabled;

  useEffect(() => {
    if (disabled && visible) {
      setVisible(false);
    }
  }, [disabled, visible]);

  useEffect(() => {
    if (!shown) {
      setCollisionOffset(0);
      return;
    }
    function updateCollisionOffset(): void {
      const root = rootRef.current;
      const bubble = bubbleRef.current;
      if (!(root && bubble)) {
        return;
      }
      setCollisionOffset(
        getVibePlayerTooltipCollisionOffset(
          bubble.getBoundingClientRect(),
          getVibePlayerTooltipBoundaryRect(root)
        )
      );
    }
    const frameId = window.requestAnimationFrame(updateCollisionOffset);
    window.addEventListener("resize", updateCollisionOffset);
    window.addEventListener("scroll", updateCollisionOffset, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateCollisionOffset);
      window.removeEventListener("scroll", updateCollisionOffset, true);
    };
  }, [shown]);

  useEffect(() => {
    if (!shown) {
      return;
    }
    const hideWhenOutside = (event: MouseEvent | PointerEvent) => {
      const root = rootRef.current;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (root && element && root.contains(element)) {
        return;
      }
      setVisible(false);
    };
    document.addEventListener("mousemove", hideWhenOutside);
    document.addEventListener("pointermove", hideWhenOutside);
    return () => {
      document.removeEventListener("mousemove", hideWhenOutside);
      document.removeEventListener("pointermove", hideWhenOutside);
    };
  }, [shown]);

  function showTooltip(): void {
    if (!disabled) {
      setVisible(true);
    }
  }

  function hideTooltip(event: FocusEvent<HTMLSpanElement>): void {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }
    setVisible(false);
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions lint/a11y/noStaticElementInteractions: the wrapper only observes pointer/focus state to render a visual tooltip for its interactive child.
    <span
      className="vibe-player-tooltip"
      data-align={align}
      data-vibe-player-tooltip
      data-visible={shown || undefined}
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={showTooltip}
      onPointerEnter={showTooltip}
      onPointerLeave={() => setVisible(false)}
      onPointerMove={showTooltip}
      ref={rootRef}
    >
      {children}
      <span
        aria-hidden={!shown}
        className="vibe-player-tooltip__bubble"
        id={tooltipId}
        ref={bubbleRef}
        role="tooltip"
        style={{ marginLeft: collisionOffset || undefined }}
      >
        <span className="vibe-player-tooltip__label">{label}</span>
        {shortcut ? (
          <span className="vibe-player-tooltip__shortcut">{shortcut}</span>
        ) : null}
      </span>
    </span>
  );
}

interface VibePlayerTooltipRect {
  left: number;
  right: number;
}

export function getVibePlayerTooltipCollisionOffset(
  bubbleRect: VibePlayerTooltipRect,
  boundaryRect: VibePlayerTooltipRect,
  padding = 8
): number {
  const safeLeft = boundaryRect.left + padding;
  const safeRight = boundaryRect.right - padding;
  const leftOverflow = safeLeft - bubbleRect.left;
  if (leftOverflow > 0) {
    return leftOverflow;
  }
  const rightOverflow = bubbleRect.right - safeRight;
  if (rightOverflow > 0) {
    return -rightOverflow;
  }
  return 0;
}

function getVibePlayerTooltipBoundaryRect(root: HTMLElement): DOMRect {
  const stage = root.closest(".vibe-player-stage");
  if (stage instanceof HTMLElement) {
    return stage.getBoundingClientRect();
  }
  return document.documentElement.getBoundingClientRect();
}
