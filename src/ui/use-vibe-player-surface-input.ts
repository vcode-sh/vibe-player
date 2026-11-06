import { type MouseEvent, type PointerEvent, useRef } from "react";
import {
  canScrubVibePlayerSurface,
  isVibePlayerSurfacePlaying,
} from "./vibe-player-surface-phase";
import type {
  VibePlayerSurfaceActions,
  VibePlayerSurfaceState,
} from "./vibe-player-surface-types";

const dragThresholdPx = 8;
const ownInputSelector =
  'button, [role="slider"], [data-part="controls"], [data-part="error"]';

interface SurfaceDrag {
  id: number;
  moved: boolean;
  scrubbing: boolean;
  startTime: number;
  width: number;
  x: number;
  y: number;
}

export interface UseVibePlayerSurfaceInputOptions {
  actions: VibePlayerSurfaceActions;
  /** A horizontal drag anywhere on the picture scrubs (Ink Chips). */
  dragToScrub: boolean;
  state: VibePlayerSurfaceState;
}

function ownsInput(target: EventTarget) {
  return target instanceof Element && target.closest(ownInputSelector) !== null;
}

/**
 * Pointer policy for compact surfaces: movement reveals, a mouse leaving
 * hides, a first touch tap reveals and never pauses, and pointer clicks
 * return focus to the player so they never pin the controls.
 */
export function useVibePlayerSurfaceInput({
  actions,
  dragToScrub,
  state,
}: UseVibePlayerSurfaceInputOptions) {
  const pointerType = useRef("mouse");
  const drag = useRef<SurfaceDrag | null>(null);
  const suppressClick = useRef(false);

  function moveDrag(event: PointerEvent<HTMLElement>, current: SurfaceDrag) {
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) > dragThresholdPx) {
      current.moved = true;
      if (
        dragToScrub &&
        Math.abs(dx) > Math.abs(dy) &&
        canScrubVibePlayerSurface(state.phase)
      ) {
        current.scrubbing = true;
        current.x = event.clientX;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        actions.scrubStart();
      }
    }
    if (current.scrubbing && state.duration > 0) {
      const delta = (event.clientX - current.x) / current.width;
      actions.scrubTo(current.startTime / state.duration + delta);
    }
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const { current } = drag;
    if (!current || current.id !== event.pointerId) {
      return;
    }
    drag.current = null;
    suppressClick.current = current.moved;
    if (current.scrubbing) {
      actions.scrubEnd();
    }
  }

  function tap() {
    if (
      pointerType.current === "touch" &&
      isVibePlayerSurfacePlaying(state.phase)
    ) {
      if (state.controlsVisible) {
        actions.hideControls();
      } else {
        actions.revealControls();
      }
      return;
    }
    if (state.phase !== "error" && state.phase !== "loading") {
      actions.primary();
    }
  }

  return {
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (suppressClick.current) {
        suppressClick.current = false;
      } else if (!(event.defaultPrevented || ownsInput(event.target))) {
        tap();
      }
      if (event.detail > 0) {
        event.currentTarget.focus({ preventScroll: true });
      }
    },
    onPointerCancel: endDrag,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      pointerType.current = event.pointerType;
      suppressClick.current = false;
      if (event.pointerType !== "touch") {
        actions.revealControls();
      }
      if (event.button > 0 || ownsInput(event.target)) {
        return;
      }
      drag.current = {
        id: event.pointerId,
        moved: false,
        scrubbing: false,
        startTime: state.time,
        width: event.currentTarget.offsetWidth || 1,
        x: event.clientX,
        y: event.clientY,
      };
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch" && !drag.current?.scrubbing) {
        actions.hideControls();
      }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const { current } = drag;
      if (current?.id === event.pointerId) {
        moveDrag(event, current);
      }
      if (event.pointerType !== "touch") {
        actions.revealControls();
      }
    },
    onPointerUp: endDrag,
  };
}
