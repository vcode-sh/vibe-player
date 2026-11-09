import { useEffect, useLayoutEffect } from "react";

/**
 * A layout effect in the browser, so its state update lands in the same
 * commit; a plain effect during server rendering, where layout effects warn.
 */
export const useVibePlayerCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
