/** A media participant shares exclusive audible playback with its group. */
export interface VibePlayerAudioFocusParticipant {
  claim(): void;
  dispose(): void;
  release(): void;
}

interface AudioFocusOwner {
  pause: () => void | Promise<void>;
  token: symbol;
}

const owners = new Map<string, AudioFocusOwner>();

function pausePrevious(owner: AudioFocusOwner | undefined): void {
  try {
    Promise.resolve(owner?.pause()).catch(() => undefined);
  } catch {
    // A host observer cannot prevent the next participant taking focus.
  }
}

/** Join host audio or video to the same group used by player hooks. */
export function createVibePlayerAudioFocusParticipant(
  group: string,
  onPause: () => void | Promise<void>
): VibePlayerAudioFocusParticipant {
  const token = Symbol(group);
  let disposed = false;
  const release = () => {
    if (owners.get(group)?.token === token) {
      owners.delete(group);
    }
  };
  return {
    claim() {
      const previous = owners.get(group);
      if (disposed || previous?.token === token) {
        return;
      }
      owners.set(group, { pause: onPause, token });
      pausePrevious(previous);
    },
    dispose() {
      release();
      disposed = true;
    },
    release,
  };
}
