import type {
  VibePlayerEvent,
  VibePlayerEventOfType,
  VibePlayerEventType,
} from "./vibe-player-host-events";

interface EventSubscription {
  readonly listener: (event: VibePlayerEvent) => unknown;
  readonly type: VibePlayerEventType | "*";
}

/** `controller.on()` subscriptions, notified in subscription order. */
export class VibePlayerEventListeners {
  private readonly subscriptions = new Set<EventSubscription>();

  add<K extends VibePlayerEventType | "*">(
    type: K,
    listener: (event: VibePlayerEventOfType<K>) => void
  ): () => void {
    const subscription: EventSubscription = {
      listener: (event) =>
        isVibePlayerEventOfType(event, type) ? listener(event) : undefined,
      type,
    };
    this.subscriptions.add(subscription);
    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  /** Listeners for `event.type` and `"*"`; unsubscribed ones are skipped. */
  *matching(event: VibePlayerEvent): Iterable<() => unknown> {
    for (const subscription of this.subscriptions) {
      if (subscription.type === "*" || subscription.type === event.type) {
        yield () => subscription.listener(event);
      }
    }
  }
}

function isVibePlayerEventOfType<K extends VibePlayerEventType | "*">(
  event: VibePlayerEvent,
  type: K
): event is VibePlayerEventOfType<K> {
  return type === "*" || event.type === type;
}
