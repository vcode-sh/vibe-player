import type { VibePlayerController } from "./vibe-player-controller";
import { onVibePlayerControllerRetire } from "./vibe-player-controller-retirement";
import { VibePlayerLatestNotifier } from "./vibe-player-latest-notifier";

/** A media participant shares exclusive audible playback with its group. */
export interface VibePlayerAudioFocusParticipant {
  claim(): void;
  /**
   * The player this participant represents; `null` for host media. Always
   * set on participants the package creates, like `group` and `mediaSession`;
   * optional so hand-written participants (test doubles) keep compiling.
   */
  readonly controller?: VibePlayerController | null | undefined;
  dispose(): void;
  readonly group?: string | undefined;
  /**
   * Whether this participant uses the page's Media Session. Taking focus
   * with `false` releases a paused player's session, so a lock screen never
   * shows a video while, say, a voice note plays.
   */
  readonly mediaSession?: boolean | undefined;
  release(): void;
}

/** What a participant represents, for focus readers and the Media Session. */
export interface VibePlayerAudioFocusParticipantOptions {
  /** The player this participant represents; retiring it releases focus. */
  controller?: VibePlayerController | null | undefined;
  /**
   * Pass `false` for media that does not use the page's Media Session.
   * Default `true`: the participant shows its own system media controls.
   */
  mediaSession?: boolean | undefined;
}

type Owner = VibePlayerAudioFocusParticipant | null;

interface AudioFocusOwner {
  participant: VibePlayerAudioFocusParticipant;
  pause: () => void | Promise<void>;
  /** Stops watching the owner's controller for retirement. */
  unwatch: () => void;
}

const defaultGroup = "default";
const owners = new Map<string, AudioFocusOwner>();
const notifiers = new Map<string, VibePlayerLatestNotifier<Owner>>();

function pausePrevious(owner: AudioFocusOwner | undefined): void {
  try {
    Promise.resolve(owner?.pause()).catch(() => undefined);
  } catch {
    // A host observer cannot prevent the next participant taking focus.
  }
}

function announce(group: string): void {
  notifiers.get(group)?.publish();
}

/** The participant that holds audible focus in `group`, or `null`. */
export function getVibePlayerAudioFocusOwner(
  group = defaultGroup
): VibePlayerAudioFocusParticipant | null {
  return owners.get(group)?.participant ?? null;
}

/**
 * Calls `listener` with the new owner (or `null`) whenever focus in `group`
 * changes hands. A claim made while listeners run restarts the delivery with
 * the newer owner; a throwing listener cannot stop the others. Returns the
 * unsubscribe function.
 */
export function subscribeVibePlayerAudioFocus(
  listener: (owner: VibePlayerAudioFocusParticipant | null) => void,
  group = defaultGroup
): () => void {
  const notifier =
    notifiers.get(group) ??
    new VibePlayerLatestNotifier(() => getVibePlayerAudioFocusOwner(group));
  notifiers.set(group, notifier);
  const remove = notifier.add(listener);
  return () => {
    remove();
    if (notifier.size === 0 && notifiers.get(group) === notifier) {
      notifiers.delete(group);
    }
  };
}

/**
 * Join host audio or video to the same group used by player hooks. Claiming
 * pauses the previous owner (`onPause`); a retired `controller` never claims.
 * While it holds focus, retiring `controller` releases it.
 */
export function createVibePlayerAudioFocusParticipant(
  group: string,
  onPause: () => void | Promise<void>,
  {
    controller = null,
    mediaSession = true,
  }: VibePlayerAudioFocusParticipantOptions = {}
): VibePlayerAudioFocusParticipant {
  let disposed = false;
  const release = () => {
    const owner = owners.get(group);
    if (owner?.participant === participant) {
      owners.delete(group);
      owner.unwatch();
      announce(group);
    }
  };
  const participant: VibePlayerAudioFocusParticipant = {
    claim() {
      const previous = owners.get(group);
      if (
        disposed ||
        controller?.retired ||
        previous?.participant === participant
      ) {
        return;
      }
      const unwatch = controller
        ? onVibePlayerControllerRetire(controller, release)
        : () => undefined;
      owners.set(group, { participant, pause: onPause, unwatch });
      previous?.unwatch();
      pausePrevious(previous);
      announce(group);
    },
    controller,
    dispose() {
      release();
      disposed = true;
    },
    group,
    mediaSession,
    release,
  };
  return participant;
}
