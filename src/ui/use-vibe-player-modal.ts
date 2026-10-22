import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { focusVibePlayerModalContent } from "./vibe-player-modal-focus";
import { lockVibePlayerModalScroll } from "./vibe-player-modal-scroll";

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
/** Native modality owns the inert background and initial browser focus. */
export function useVibePlayerModal(open: boolean) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const setDialogRef = useCallback((element: HTMLDialogElement | null) => {
    if (element) {
      const active = element.ownerDocument.activeElement;
      if (active instanceof HTMLElement && !element.contains(active)) {
        opener.current = active;
      }
    }
    setDialog(element);
  }, []);

  useCommitEffect(() => {
    if (!dialog) {
      return;
    }
    if (!open) {
      if (opener.current?.isConnected) {
        opener.current.focus({ preventScroll: true });
      }
      return;
    }
    const active = dialog.ownerDocument.activeElement;
    if (active instanceof HTMLElement && !dialog.contains(active)) {
      opener.current = active;
    }
    if (!dialog.open) {
      dialog.showModal();
    }
    focusVibePlayerModalContent(dialog);
    const releaseScroll = lockVibePlayerModalScroll(dialog.ownerDocument);
    return () => {
      dialog.close();
      releaseScroll();
      if (opener.current?.isConnected) {
        opener.current.focus({ preventScroll: true });
      }
    };
  }, [dialog, open]);

  return setDialogRef;
}
