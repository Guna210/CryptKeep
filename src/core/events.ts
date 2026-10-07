/** Events emitted by the simulation boundary. Payloads stay flat and primitive so snapshots are detached. */
export type GameEventInput =
  | { type: "session-ready" }
  | { type: "session-paused"; reason: string }
  | { type: "session-resumed"; reason: string }
  | { type: "session-disposed" }
  | { type: "damage-applied"; sourceId: string; targetId: string; attackId: string; damageType: "physical"; amount: number; hpRemaining: number }
  | { type: "entity-died"; sourceId: string; targetId: string; attackId: string; damageType: "physical" };

/** Kept as a named alias for lifecycle producers from CK-00-07. */
export type LifecycleEventInput = Extract<GameEventInput, { type: `session-${string}` }>;

export type GameEvent = Readonly<GameEventInput & { tick: number }>;
export type EventBatch = readonly GameEvent[];
export type EventSubscriber = (batch: EventBatch) => void;
export type Unsubscribe = () => void;

/**
 * Collects immutable event snapshots for one explicitly selected simulation tick.
 * Flush consumes that tick and delivers one ordered batch to each subscriber.
 * A subscriber removed during delivery still receives the batch already being
 * delivered; adding subscribers during delivery is rejected.
 * Mutating the collector from a callback is rejected. Subscriber exceptions are
 * collected while remaining subscribers run, then reported as an AggregateError.
 */
export class EventCollector {
  private tick: number | undefined;
  private pending: GameEvent[] = [];
  private readonly subscribers = new Map<number, EventSubscriber>();
  private nextSubscriberId = 0;
  private dispatching = false;
  private disposed = false;

  beginTick(tick: number): void {
    this.assertUsable();
    this.assertNotDispatching();
    if (!Number.isFinite(tick) || !Number.isInteger(tick)) {
      throw new RangeError("tick must be a finite integer");
    }
    if (this.tick !== undefined) throw new Error("previous tick has not been flushed");
    this.tick = tick;
  }

  emit(event: GameEventInput): void {
    this.assertUsable();
    this.assertNotDispatching();
    if (this.tick === undefined) throw new Error("beginTick must be called before emit");

    // Lifecycle event data is deliberately flat and primitive, so a fresh frozen
    // record severs every producer-owned reference before it is retained.
    let snapshot: GameEvent;
    switch (event.type) {
      case "session-paused": case "session-resumed":
        snapshot = Object.freeze({ type: event.type, reason: event.reason, tick: this.tick }); break;
      case "damage-applied":
        snapshot = Object.freeze({ type: event.type, sourceId: event.sourceId, targetId: event.targetId, attackId: event.attackId, damageType: event.damageType, amount: event.amount, hpRemaining: event.hpRemaining, tick: this.tick }); break;
      case "entity-died":
        snapshot = Object.freeze({ type: event.type, sourceId: event.sourceId, targetId: event.targetId, attackId: event.attackId, damageType: event.damageType, tick: this.tick }); break;
      default:
        snapshot = Object.freeze({ type: event.type, tick: this.tick });
    }
    this.pending.push(snapshot);
  }

  flush(): EventBatch {
    this.assertUsable();
    this.assertNotDispatching();
    if (this.tick === undefined) throw new Error("beginTick must be called before flush");

    const batch = Object.freeze(this.pending.slice());
    this.pending = [];
    this.tick = undefined;
    const subscribers = [...this.subscribers.values()];
    const errors: unknown[] = [];
    this.dispatching = true;
    try {
      for (const subscriber of subscribers) {
        try {
          subscriber(batch);
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      this.dispatching = false;
    }
    if (errors.length > 0) throw new AggregateError(errors, "event subscriber failed");
    return batch;
  }

  subscribe(subscriber: EventSubscriber): Unsubscribe {
    this.assertUsable();
    if (this.dispatching) throw new Error("cannot subscribe during event delivery");
    const id = this.nextSubscriberId++;
    this.subscribers.set(id, subscriber);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.subscribers.delete(id);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.assertNotDispatching();
    this.disposed = true;
    this.pending = [];
    this.tick = undefined;
    this.subscribers.clear();
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error("event collector is disposed");
  }

  private assertNotDispatching(): void {
    if (this.dispatching) throw new Error("event collector cannot be mutated during event delivery");
  }
}
