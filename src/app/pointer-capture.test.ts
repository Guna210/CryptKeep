import { describe, expect, it, vi } from "vitest";
import { InputSampler } from "../core/input";
import { createPointerCapture } from "./pointer-capture";

class FakeTarget implements EventTarget {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (callback) this.listeners.get(type)?.delete(callback);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of [...(this.listeners.get(event.type) ?? [])]) {
      if (typeof listener === "function") listener.call(this, event);
      else listener.handleEvent(event);
    }
    return !event.defaultPrevented;
  }

  listenerCount(type: string): number { return this.listeners.get(type)?.size ?? 0; }
  emit(type: string): void { this.dispatchEvent(new Event(type)); }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, decline) => { resolve = accept; reject = decline; });
  return { promise, resolve, reject };
}

function makeHarness(request: () => Promise<void> | void) {
  const documentTarget = new FakeTarget() as FakeTarget & {
    pointerLockElement: Element | null;
    visibilityState: DocumentVisibilityState;
    exitPointerLock: () => void;
  };
  documentTarget.pointerLockElement = null;
  documentTarget.visibilityState = "visible";
  const windowTarget = new FakeTarget();
  const surfaceTarget = new FakeTarget() as FakeTarget & {
    ownerDocument: Document;
    requestPointerLock: () => Promise<void> | void;
  };
  const exit = vi.fn(() => {
    documentTarget.pointerLockElement = null;
    documentTarget.emit("pointerlockchange");
  });
  documentTarget.exitPointerLock = exit;
  surfaceTarget.ownerDocument = documentTarget as unknown as Document;
  surfaceTarget.requestPointerLock = request;
  const input = new InputSampler();
  const states: string[] = [];
  const capture = createPointerCapture(
    surfaceTarget as unknown as HTMLElement,
    input,
    {
      document: documentTarget as unknown as Document,
      window: windowTarget as unknown as Window,
      onStateChange: (state) => states.push(state),
    },
  );
  return { documentTarget, windowTarget, surfaceTarget, exit, input, states, capture };
}

const settle = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

describe("PointerCapture physical request serialization", () => {
  it.each(["resolve", "reject"] as const)("waits for promise request A to %s before a fresh gesture can start C", async (settlement) => {
    const a = deferred<void>();
    const c = deferred<void>();
    const request = vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(c.promise);
    const harness = makeHarness(request);

    harness.capture.requestFromGesture();
    harness.windowTarget.emit("blur");
    expect(harness.capture.state).toBe("idle");
    harness.capture.requestFromGesture();
    expect(harness.capture.state).toBe("waiting");
    expect(request).toHaveBeenCalledOnce();
    harness.documentTarget.pointerLockElement = harness.surfaceTarget as unknown as Element;
    harness.surfaceTarget.dispatchEvent(Object.assign(new Event("mousemove"), { movementX: 15, movementY: 8 }));
    expect(harness.input.sample().look).toEqual({ x: 0, y: 0 });

    if (settlement === "resolve") {
      harness.documentTarget.emit("pointerlockchange");
      expect(harness.exit).toHaveBeenCalledOnce();
      expect(harness.capture.state).toBe("waiting");
    } else {
      harness.documentTarget.pointerLockElement = {} as Element;
      harness.documentTarget.emit("pointerlockchange");
      harness.documentTarget.emit("pointerlockerror");
      expect(harness.capture.state).toBe("waiting");
      expect(harness.exit).not.toHaveBeenCalled();
    }
    if (settlement === "resolve") a.resolve();
    else a.reject(new Error("canceled request failed"));
    await settle();
    expect(harness.capture.state).toBe("idle");
    expect(request).toHaveBeenCalledOnce();
    expect(harness.documentTarget.pointerLockElement).not.toBe(harness.surfaceTarget);

    harness.capture.requestFromGesture();
    expect(request).toHaveBeenCalledTimes(2);
    expect(harness.capture.state).toBe("requesting");
    harness.documentTarget.pointerLockElement = harness.surfaceTarget as unknown as Element;
    harness.documentTarget.emit("pointerlockchange");
    c.resolve();
    await settle();
    expect(harness.capture.state).toBe("captured");
  });

  it.each(["acquisition", "error"] as const)("serializes canceled legacy A through late %s without queuing B", (terminal) => {
    const request = vi.fn(() => undefined);
    const harness = makeHarness(request);
    harness.capture.requestFromGesture();
    harness.windowTarget.emit("blur");
    harness.capture.requestFromGesture();
    expect(harness.capture.state).toBe("waiting");
    expect(request).toHaveBeenCalledOnce();
    harness.surfaceTarget.dispatchEvent(Object.assign(new Event("mousemove"), { movementX: 15, movementY: 8 }));
    expect(harness.input.sample().look).toEqual({ x: 0, y: 0 });

    if (terminal === "acquisition") {
      harness.documentTarget.pointerLockElement = harness.surfaceTarget as unknown as Element;
      harness.documentTarget.emit("pointerlockchange");
      expect(harness.exit).toHaveBeenCalledOnce();
    } else {
      harness.documentTarget.emit("pointerlockerror");
    }
    expect(harness.capture.state).toBe("idle");
    expect(request).toHaveBeenCalledOnce();

    harness.capture.requestFromGesture();
    expect(request).toHaveBeenCalledTimes(2);
    expect(harness.capture.state).toBe("requesting");
    if (terminal === "acquisition") {
      harness.documentTarget.pointerLockElement = harness.surfaceTarget as unknown as Element;
      harness.documentTarget.emit("pointerlockchange");
      expect(harness.capture.state).toBe("captured");
    } else {
      harness.documentTarget.emit("pointerlockerror");
      expect(harness.capture.state).toBe("failed");
    }
  });

  it.each(["acquisition", "error"] as const)("keeps only terminal guards after cancel-then-dispose until late %s", (terminal) => {
    const harness = makeHarness(() => undefined);
    harness.capture.requestFromGesture();
    harness.windowTarget.emit("blur");
    harness.capture.requestFromGesture();
    expect(harness.capture.state).toBe("waiting");
    harness.capture.dispose();
    expect(harness.capture.state).toBe("disposed");
    expect(harness.documentTarget.listenerCount("visibilitychange")).toBe(0);
    expect(harness.windowTarget.listenerCount("blur")).toBe(0);
    expect(harness.windowTarget.listenerCount("keydown")).toBe(0);
    expect(harness.surfaceTarget.listenerCount("mousemove")).toBe(0);
    expect(harness.surfaceTarget.listenerCount("contextmenu")).toBe(0);
    expect(harness.documentTarget.listenerCount("pointerlockchange")).toBe(1);
    expect(harness.documentTarget.listenerCount("pointerlockerror")).toBe(1);

    harness.documentTarget.pointerLockElement = {} as Element;
    harness.documentTarget.emit("pointerlockchange");
    expect(harness.documentTarget.listenerCount("pointerlockchange")).toBe(1);
    harness.capture.requestFromGesture();
    harness.windowTarget.emit("blur");
    expect(harness.capture.state).toBe("disposed");
    expect(harness.states.at(-1)).toBe("disposed");

    if (terminal === "acquisition") {
      harness.documentTarget.pointerLockElement = harness.surfaceTarget as unknown as Element;
      harness.documentTarget.emit("pointerlockchange");
      expect(harness.exit).toHaveBeenCalledOnce();
    } else {
      harness.documentTarget.emit("pointerlockerror");
      expect(harness.exit).not.toHaveBeenCalled();
    }
    expect(harness.capture.state).toBe("disposed");
    expect(harness.documentTarget.listenerCount("pointerlockchange")).toBe(0);
    expect(harness.documentTarget.listenerCount("pointerlockerror")).toBe(0);
    expect(harness.states.at(-1)).toBe("disposed");
  });

  it("removes every listener immediately on ordinary disposal", () => {
    const ordinary = makeHarness(() => undefined);
    ordinary.capture.dispose();
    for (const type of ["pointerlockchange", "pointerlockerror", "visibilitychange"]) {
      expect(ordinary.documentTarget.listenerCount(type)).toBe(0);
    }
    expect(ordinary.windowTarget.listenerCount("blur")).toBe(0);
    expect(ordinary.windowTarget.listenerCount("keydown")).toBe(0);
    expect(ordinary.surfaceTarget.listenerCount("mousemove")).toBe(0);
    expect(ordinary.surfaceTarget.listenerCount("contextmenu")).toBe(0);
  });
});
