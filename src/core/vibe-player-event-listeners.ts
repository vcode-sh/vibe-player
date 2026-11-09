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

  /**
   * Listeners for `event.type` and `"*"`, taken now, when the delivery
   * starts: one added later starts with the next event. Each call skips a
   * listener unsubscribed in the meantime.
   */
  matching(event: VibePlayerEvent): (() => unknown)[] {
    return [...this.subscriptions]
      .filter(({ type }) => type === "*" || type === event.type)
      .map(
        (subscription) => () =>
          this.subscriptions.has(subscription)
            ? subscription.listener(event)
            : undefined
      );
  }
}

function isVibePlayerEventOfType<K extends VibePlayerEventType | "*">(
  event: VibePlayerEvent,
  type: K
): event is VibePlayerEventOfType<K> {
  return type === "*" || event.type === type;
}
