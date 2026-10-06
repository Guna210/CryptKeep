import { describe, expect, it, vi } from "vitest";
import { EventCollector, type EventBatch } from "./events";

describe("EventCollector", () => {
  it("preserves event order and tick boundaries across batches", () => {
    const collector = new EventCollector();
    const received: EventBatch[] = [];
    collector.subscribe((batch) => received.push(batch));

    collector.beginTick(0);
    collector.emit({ type: "session-ready" });
    collector.emit({ type: "session-paused", reason: "menu" });
    const first = collector.flush();
    collector.beginTick(1);
    collector.emit({ type: "session-resumed", reason: "menu closed" });
    const second = collector.flush();

    expect(first).toEqual([
      { type: "session-ready", tick: 0 },
      { type: "session-paused", reason: "menu", tick: 0 },
    ]);
    expect(second).toEqual([{ type: "session-resumed", reason: "menu closed", tick: 1 }]);
    expect(received).toEqual([first, second]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
  });

  it("isolates subscribers and retained batches from attempted mutation", () => {
    const collector = new EventCollector();
    const secondSubscriberBatches: EventBatch[] = [];
    collector.subscribe((batch) => {
      expect(() => (batch as unknown as unknown[]).push({ type: "bad" })).toThrow();
      expect(() => { (batch[0] as { tick: number }).tick = 99; }).toThrow();
    });
    collector.subscribe((batch) => { secondSubscriberBatches.push(batch); });
    collector.beginTick(4);
    collector.emit({ type: "session-paused", reason: "focus lost" });
    const retained = collector.flush();
    collector.beginTick(5);
    collector.emit({ type: "session-resumed", reason: "focus returned" });
    collector.flush();

    expect(retained[0]).toEqual({ type: "session-paused", reason: "focus lost", tick: 4 });
    expect(secondSubscriberBatches[0]).toBe(retained);
  });

  it("delivers to a stable subscription snapshot and makes unsubscribe idempotent", () => {
    const collector = new EventCollector();
    const calls: string[] = [];
    let removeSecond = (): void => undefined;
    collector.subscribe(() => {
      calls.push("first");
      removeSecond();
    });
    removeSecond = collector.subscribe(() => { calls.push("second"); });
    collector.beginTick(1);
    collector.emit({ type: "session-ready" });
    collector.flush();
    removeSecond();
    collector.beginTick(2);
    collector.emit({ type: "session-ready" });
    collector.flush();
    expect(calls).toEqual(["first", "second", "first"]);
  });

  it("continues unrelated delivery after a subscriber throws", () => {
    const collector = new EventCollector();
    const later = vi.fn();
    collector.subscribe(() => { throw new Error("consumer failed"); });
    collector.subscribe(later);
    collector.beginTick(8);
    collector.emit({ type: "session-disposed" });
    expect(() => collector.flush()).toThrow(AggregateError);
    expect(later).toHaveBeenCalledWith([{ type: "session-disposed", tick: 8 }]);
    // The failed flush still consumed its batch, so the next tick is usable.
    collector.beginTick(9);
    collector.emit({ type: "session-ready" });
    expect(() => collector.flush()).toThrow(AggregateError);
  });

  it("rejects invalid boundaries, missing boundaries, recursive mutation, and use after disposal", () => {
    const collector = new EventCollector();
    expect(() => collector.beginTick(Number.NaN)).toThrow(RangeError);
    expect(() => collector.beginTick(1.5)).toThrow(RangeError);
    expect(() => collector.emit({ type: "session-ready" })).toThrow();
    expect(() => collector.flush()).toThrow();

    let recursiveError: unknown;
    collector.subscribe(() => {
      try { collector.emit({ type: "session-ready" }); } catch (error) { recursiveError = error; }
      try { collector.flush(); } catch (error) { recursiveError = error; }
    });
    collector.beginTick(2);
    collector.emit({ type: "session-ready" });
    collector.flush();
    expect(recursiveError).toBeInstanceOf(Error);
    collector.dispose();
    collector.dispose();
    expect(() => collector.beginTick(3)).toThrow(/disposed/);
    expect(() => collector.subscribe(() => undefined)).toThrow(/disposed/);
  });
});
