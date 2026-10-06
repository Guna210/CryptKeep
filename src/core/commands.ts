/** Semantic controls emitted by the input boundary. Browser key bindings map into these names. */
export const ACTIONS = [
  "moveForward", "moveBackward", "moveLeft", "moveRight", "sprint", "dash",
  "primary", "secondary", "interact", "heal", "slotOne", "slotTwo",
  "inventory", "map", "pause",
] as const;

export type Action = (typeof ACTIONS)[number];
export type MovementDirection = "forward" | "backward" | "left" | "right";
export type InputEdge = Readonly<{ action: Action; type: "pressed" | "released" }>;
export type InputCancellationReason =
  | "pause" | "blur" | "hidden" | "pointer-lock-lost" | "inventory"
  | "death" | "victory" | "floor-loading" | "weapon-switch" | "resource-failure";

/** Raw command axes stay in [-1, 1]. A diagonal therefore has length sqrt(2); locomotion normalizes it. */
export interface GameCommand {
  readonly movement: Readonly<{ x: number; y: number }>;
  readonly look: Readonly<{ x: number; y: number }>;
  readonly held: readonly Action[];
  readonly pressed: readonly Action[];
  readonly released: readonly Action[];
  /** All transitions in arrival order, including multiple valid transitions for one action. */
  readonly edges: readonly InputEdge[];
  /** Cancellations are not releases and never imply a committed button-up attack. */
  readonly cancellations: readonly InputCancellationReason[];
}
