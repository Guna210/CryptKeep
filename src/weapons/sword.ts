import type { GameCommand, InputCancellationReason } from "../core/commands";
import type { AttackRequest, CurrentWeapon, WeaponEvent, WeaponState, WeaponUpdateContext, WeaponUpdateResult } from "./types";

export const SWORD_LIGHT_DAMAGE = 18;
export const SWORD_LIGHT_STAMINA_COST = 10;
export const SWORD_LIGHT_WINDUP_SECONDS = 0.06;
export const SWORD_LIGHT_ACTIVE_SECONDS = 0.12;
export const SWORD_LIGHT_RECOVERY_SECONDS = 0.30;
export const SWORD_HEAVY_MIN_DAMAGE = 30;
export const SWORD_HEAVY_MAX_DAMAGE = 54;
export const SWORD_HEAVY_MIN_STAMINA_COST = 18;
export const SWORD_HEAVY_MAX_STAMINA_COST = 30;
export const SWORD_HEAVY_WINDUP_SECONDS = 0.10;
export const SWORD_HEAVY_ACTIVE_SECONDS = 0.16;
export const SWORD_HEAVY_RECOVERY_SECONDS = 0.50;
export const SWORD_CHARGE_THRESHOLD_SECONDS = 0.25;
export const SWORD_FULL_CHARGE_SECONDS = 1.2;

export type SwordAttackKind = "sword-light" | "sword-heavy";
export interface SwordAttackTiming {
  readonly windupSeconds: number;
  readonly activeSeconds: number;
  readonly recoverySeconds: number;
}

/** Serializable immutable simulation state, including committed values for animation readers. */
export interface SwordState extends WeaponState {
  readonly weaponClass: "sword";
  /** Kahan correction for held-time accumulation; it prevents tick drift without threshold fuzz. */
  readonly heldTimeCompensationSeconds: number;
  /** Populated after an accepted release; callbacks and runtime services never enter saved state. */
  readonly committedKind: SwordAttackKind | null;
  readonly committedDamage: number | null;
  readonly committedTiming: SwordAttackTiming | null;
}

export function createSwordState(): SwordState {
  return Object.freeze({ weaponClass: "sword", phase: "idle", elapsedSeconds: 0, attackId: null, primaryHeld: false, heldTimeCompensationSeconds: 0,
    committedKind: null, committedDamage: null, committedTiming: null });
}

/** True only after the discrete threshold; normalized power reaches 1 at 1.2 seconds. */
export function isSwordCharging(state: SwordState): boolean {
  validateState(state);
  return state.phase === "anticipation" && state.primaryHeld && state.elapsedSeconds >= SWORD_CHARGE_THRESHOLD_SECONDS;
}
export function swordChargeFraction(state: SwordState): number {
  validateState(state);
  return state.phase === "anticipation" && state.primaryHeld
    ? clamp((state.elapsedSeconds - SWORD_CHARGE_THRESHOLD_SECONDS) / (SWORD_FULL_CHARGE_SECONDS - SWORD_CHARGE_THRESHOLD_SECONDS), 0, 1)
    : 0;
}

export const sword: CurrentWeapon<SwordState> = Object.freeze({ weaponClass: "sword", update: updateSword, cancel: cancelSword });

/**
 * Commands apply ordered edges at tick start; elapsed simulation time then advances the
 * resulting state. Charge is sampled at release, with exactly 0.25 s selecting heavy.
 * A 60 Hz sequence reaches this boundary after 15 ticks and full charge after 72 ticks.
 */
export function updateSword(state: SwordState, command: GameCommand, context: WeaponUpdateContext): WeaponUpdateResult<SwordState> {
  validateState(state);
  if (!Number.isFinite(context.dtSeconds) || context.dtSeconds < 0) throw new RangeError("Sword dt must be finite nonnegative simulation seconds");
  if (!command || !Array.isArray(command.edges)) throw new TypeError("Sword update requires ordered command edges");

  let next = state;
  const attacks: AttackRequest[] = [];
  const events: WeaponEvent[] = [];
  for (const edge of command.edges) {
    if (edge.action !== "primary") continue;
    if (edge.type === "pressed") {
      if (next.phase === "idle") next = freezeState({ ...next, phase: "anticipation", elapsedSeconds: 0, attackId: null, primaryHeld: true,
        heldTimeCompensationSeconds: 0, committedKind: null, committedDamage: null, committedTiming: null });
    } else if (edge.type === "released") {
      if (next.phase === "anticipation" && next.primaryHeld) {
        const heldSeconds = next.elapsedSeconds;
        const heavy = heldSeconds >= SWORD_CHARGE_THRESHOLD_SECONDS;
        const q = heavy ? clamp((heldSeconds - SWORD_CHARGE_THRESHOLD_SECONDS) / (SWORD_FULL_CHARGE_SECONDS - SWORD_CHARGE_THRESHOLD_SECONDS), 0, 1) : 0;
        const kind: SwordAttackKind = heavy ? "sword-heavy" : "sword-light";
        const damage = heavy ? SWORD_HEAVY_MIN_DAMAGE + (SWORD_HEAVY_MAX_DAMAGE - SWORD_HEAVY_MIN_DAMAGE) * q : SWORD_LIGHT_DAMAGE;
        const staminaCost = heavy ? SWORD_HEAVY_MIN_STAMINA_COST + (SWORD_HEAVY_MAX_STAMINA_COST - SWORD_HEAVY_MIN_STAMINA_COST) * q : SWORD_LIGHT_STAMINA_COST;
        const timing = Object.freeze(heavy
          ? { windupSeconds: SWORD_HEAVY_WINDUP_SECONDS, activeSeconds: SWORD_HEAVY_ACTIVE_SECONDS, recoverySeconds: SWORD_HEAVY_RECOVERY_SECONDS }
          : { windupSeconds: SWORD_LIGHT_WINDUP_SECONDS, activeSeconds: SWORD_LIGHT_ACTIVE_SECONDS, recoverySeconds: SWORD_LIGHT_RECOVERY_SECONDS });
        const attackId = context.nextAttackId();
        const cost = context.commitStamina(attackId, staminaCost);
        next = cost.accepted
          ? freezeState({ ...next, phase: "windup", elapsedSeconds: 0, heldTimeCompensationSeconds: 0, attackId, primaryHeld: false, committedKind: kind, committedDamage: damage, committedTiming: timing })
          : createSwordState();
      } else if (next.phase === "anticipation") next = freezeState({ ...next, primaryHeld: false });
      else if (next.primaryHeld) next = freezeState({ ...next, primaryHeld: false });
    }
  }

  let remaining = context.dtSeconds;
  for (let transitions = 0; remaining > 0 && transitions < 8; transitions++) {
    if (next.phase === "anticipation") {
      const adjusted = remaining - next.heldTimeCompensationSeconds;
      const accumulated = next.elapsedSeconds + adjusted;
      const correction = (accumulated - next.elapsedSeconds) - adjusted;
      next = freezeState({ ...next, elapsedSeconds: accumulated, heldTimeCompensationSeconds: correction }); remaining = 0;
    } else if (next.phase === "windup") {
      const left = next.committedTiming!.windupSeconds - next.elapsedSeconds;
      if (!reachesBoundary(remaining, left)) { next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining }); remaining = 0; }
      else { remaining = Math.max(0, remaining - left); next = freezeState({ ...next, phase: "active", elapsedSeconds: 0 }); attacks.push(makeAttack(next)); }
    } else if (next.phase === "active") {
      const left = next.committedTiming!.activeSeconds - next.elapsedSeconds;
      if (!reachesBoundary(remaining, left)) { next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining }); remaining = 0; }
      else { remaining = Math.max(0, remaining - left); next = freezeState({ ...next, phase: "recovery", elapsedSeconds: 0 }); }
    } else if (next.phase === "recovery") {
      const left = next.committedTiming!.recoverySeconds - next.elapsedSeconds;
      if (!reachesBoundary(remaining, left)) { next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining }); remaining = 0; }
      else { remaining = Math.max(0, remaining - left); next = createSwordState(); }
    } else remaining = 0;
  }
  return Object.freeze({ state: next, attacks: Object.freeze(attacks), events: Object.freeze(events) });
}

/** Cancellation clears charge or attack phase; committed stamina remains owned by dispatcher. */
export function cancelSword(state: SwordState, _reason: InputCancellationReason): SwordState {
  validateState(state);
  return createSwordState();
}

function makeAttack(state: SwordState): AttackRequest {
  return Object.freeze({ attackId: state.attackId!, weaponClass: "sword", kind: state.committedKind!, phase: "active-hit",
    damage: state.committedDamage!, costCommitmentId: state.attackId! });
}
function freezeState(state: SwordState): SwordState { return Object.freeze(state); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function reachesBoundary(remaining: number, phaseRemaining: number): boolean {
  return remaining >= phaseRemaining || phaseRemaining - remaining <= Number.EPSILON * 8;
}
function validateState(state: SwordState): void {
  const validTiming = state?.committedTiming === null || (state?.committedTiming !== undefined &&
    Number.isFinite(state.committedTiming.windupSeconds) && state.committedTiming.windupSeconds > 0 &&
    Number.isFinite(state.committedTiming.activeSeconds) && state.committedTiming.activeSeconds > 0 &&
    Number.isFinite(state.committedTiming.recoverySeconds) && state.committedTiming.recoverySeconds > 0);
  const committed = state?.committedKind === null
    ? state?.committedDamage === null && state?.committedTiming === null
    : (state?.committedKind === "sword-light" || state?.committedKind === "sword-heavy") && Number.isFinite(state?.committedDamage) && state.committedDamage! > 0 && validTiming;
  const needsCommit = state && ["windup", "active", "recovery"].includes(state.phase);
  if (!state || state.weaponClass !== "sword" || !["idle", "anticipation", "windup", "active", "recovery"].includes(state.phase) ||
    !Number.isFinite(state.elapsedSeconds) || state.elapsedSeconds < 0 || !Number.isFinite(state.heldTimeCompensationSeconds) ||
    typeof state.primaryHeld !== "boolean" || !validTiming || !committed ||
    (needsCommit && (state.attackId === null || state.committedKind === null)) ||
    (state.attackId !== null && (typeof state.attackId !== "string" || !state.attackId))) {
    throw new TypeError("Sword state must have a known phase, finite nonnegative seconds, held flag, and consistent committed attack data");
  }
}
