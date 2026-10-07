import type { GameCommand, InputCancellationReason } from "../core/commands";
import type { ResourceValue } from "../player/resources";

export type WeaponClass = "sword";
export type WeaponPhase = "idle" | "anticipation" | "windup" | "active" | "recovery";

/** Immutable intent for the combat adapter; emitting intent never applies damage. */
export interface AttackRequest {
  readonly attackId: string;
  readonly weaponClass: WeaponClass;
  readonly kind: "sword-light" | "sword-heavy";
  readonly phase: "active-hit";
  readonly damage: number;
  /** The attack ID whose release-time cost was committed; active ticks reuse this ID without spending. */
  readonly costCommitmentId: string;
}

export interface WeaponState {
  readonly weaponClass: WeaponClass;
  readonly phase: WeaponPhase;
  readonly elapsedSeconds: number;
  readonly attackId: string | null;
  readonly primaryHeld: boolean;
}

export interface WeaponUpdateResult<S extends WeaponState = WeaponState> {
  readonly state: S;
  readonly attacks: readonly AttackRequest[];
  readonly events: readonly WeaponEvent[];
}

export type WeaponEvent =
  | Readonly<{ type: "attack-rejected"; reason: "invalid-cost" | "insufficient-resource" | "duplicate-commitment"; attackId: string }>
  | Readonly<{ type: "attack-committed"; attackId: string; staminaCost: number }>;

/** Transient per-update services. Do not place these callbacks in serialized weapon state. */
export interface WeaponUpdateContext {
  readonly dtSeconds: number;
  /** Current committed shared pool; reflects earlier successful commits in this same update. */
  readonly stamina: ResourceValue;
  readonly nextAttackId: () => string;
  readonly commitStamina: (attackId: string, amount: number) => StaminaCommitResult;
}

export interface StaminaCommitResult {
  readonly accepted: boolean;
  readonly reason?: "invalid-cost" | "insufficient-resource" | "duplicate-commitment";
  readonly stamina: ResourceValue;
}

export interface CurrentWeapon<S extends WeaponState = WeaponState> {
  readonly weaponClass: WeaponClass;
  update(state: S, command: GameCommand, context: WeaponUpdateContext): WeaponUpdateResult<S>;
  cancel(state: S, reason: InputCancellationReason): S;
}
