import {
  type Action,
  type GameCommand,
  type InputCancellationReason,
  type InputEdge,
  type MovementDirection,
} from "./commands";

const DIRECTIONS: Readonly<Record<MovementDirection, Action>> = {
  forward: "moveForward", backward: "moveBackward", left: "moveLeft", right: "moveRight",
};
const AXIS_SIGN: Readonly<Record<MovementDirection, 1 | -1>> = {
  forward: 1, backward: -1, left: -1, right: 1,
};
const finite = (n: number): number => Number.isFinite(n) ? n : 0;

/** Pure semantic input accumulator. It has no browser listeners or key-code policy. */
export class InputSampler {
  private heldActions = new Set<Action>();
  private edgeQueue: InputEdge[] = [];
  private cancellationQueue: InputCancellationReason[] = [];
  private lookX = 0;
  private lookY = 0;

  /** A duplicate down (including keyboard repeat) has no edge; a fresh down does. */
  press(action: Action): void {
    if (this.heldActions.has(action)) return;
    this.heldActions.add(action);
    this.edgeQueue.push({ action, type: "pressed" });
  }

  /** A normal up edge exists only when that semantic action was held. */
  release(action: Action): void {
    if (!this.heldActions.delete(action)) return;
    this.edgeQueue.push({ action, type: "released" });
  }

  /** Convenience adapter for a keyboard direction; opposition cancels in raw axes. */
  setDirection(direction: MovementDirection, isHeld: boolean): void {
    if (isHeld) this.press(DIRECTIONS[direction]);
    else this.release(DIRECTIONS[direction]);
  }

  /** Adds relative mouse movement. Nonfinite deltas are ignored and cannot poison future commands. */
  addLookDelta(x: number, y: number): void {
    this.lookX = finite(this.lookX + finite(x));
    this.lookY = finite(this.lookY + finite(y));
  }

  /** Clears all active/pending input. Cancellation chronology is retained separately from normal edges.
   * Input added after this call is eligible for the next sample alongside the cancellation report.
   */
  clearInput(reason: InputCancellationReason): void {
    this.heldActions.clear();
    this.edgeQueue = [];
    this.lookX = 0;
    this.lookY = 0;
    this.cancellationQueue.push(reason);
  }

  /** Snapshot and consume transient edges, cancellations and look exactly once. */
  sample(): GameCommand {
    const edges = this.edgeQueue.map((edge) => ({ action: edge.action, type: edge.type } as const));
    const pressed = edges.filter((edge) => edge.type === "pressed").map((edge) => edge.action);
    const released = edges.filter((edge) => edge.type === "released").map((edge) => edge.action);
    const held = [...this.heldActions];
    const cancellations = [...this.cancellationQueue];
    const x = this.directionAxis("left", "right");
    const y = this.directionAxis("backward", "forward");
    const lookX = finite(this.lookX);
    const lookY = finite(this.lookY);

    this.edgeQueue = [];
    this.cancellationQueue = [];
    this.lookX = 0;
    this.lookY = 0;

    return {
      movement: { x, y }, look: { x: lookX, y: lookY },
      held, pressed, released, edges, cancellations,
    };
  }

  private directionAxis(negative: MovementDirection, positive: MovementDirection): number {
    const neg = this.heldActions.has(DIRECTIONS[negative]) ? AXIS_SIGN[negative] : 0;
    const pos = this.heldActions.has(DIRECTIONS[positive]) ? AXIS_SIGN[positive] : 0;
    // Opposing directions sum to zero; raw diagonal axes are intentionally unnormalized.
    return Math.max(-1, Math.min(1, neg + pos));
  }
}
