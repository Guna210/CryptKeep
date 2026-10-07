import type { GameCommand, InputCancellationReason } from "../core/commands";
import type { AttackRequest, CurrentWeapon, WeaponEvent, WeaponState, WeaponUpdateContext, WeaponUpdateResult } from "./types";

export const SWORD_LIGHT_DAMAGE = 18;
export const SWORD_LIGHT_STAMINA_COST = 10;
export const SWORD_LIGHT_WINDUP_SECONDS = 0.06;
export const SWORD_LIGHT_ACTIVE_SECONDS = 0.12;
export const SWORD_LIGHT_RECOVERY_SECONDS = 0.30;

/** Serializable, immutable sword simulation state. All timing values are simulation seconds. */
export interface SwordState extends WeaponState {
  readonly weaponClass: "sword";
}

export function createSwordState(): SwordState {
  return Object.freeze({ weaponClass: "sword", phase: "idle", elapsedSeconds: 0, attackId: null, primaryHeld: false });
}

export const sword: CurrentWeapon<SwordState> = Object.freeze({
  weaponClass: "sword",
  update: updateSword,
  cancel: cancelSword,
});

/**
 * Primary press only enters anticipation. A primary release commits one light slash
 * (heavy charge is introduced by CK-03-05). Active-hit intent is emitted once, on
 * entering the active window. Commands apply their ordered edges at the tick start;
 * dtSeconds then advances the resulting state, carrying any remainder across phases.
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
      if (next.phase === "idle") next = freezeState({ ...next, phase: "anticipation", elapsedSeconds: 0, attackId: null, primaryHeld: true });
      else if (next.phase === "anticipation") next = freezeState({ ...next, primaryHeld: true });
    } else if (edge.type === "released") {
      if (next.phase === "anticipation" && next.primaryHeld) {
        const attackId = context.nextAttackId();
        const cost = context.commitStamina(attackId, SWORD_LIGHT_STAMINA_COST);
        next = cost.accepted
          ? freezeState({ ...next, phase: "windup", elapsedSeconds: 0, attackId, primaryHeld: false })
          : freezeState({ ...next, phase: "idle", elapsedSeconds: 0, attackId: null, primaryHeld: false });
        // The dispatcher already turns callback rejection into the authoritative event.
      } else if (next.phase === "anticipation") {
        next = freezeState({ ...next, primaryHeld: false });
      } else {
        next = freezeState({ ...next, primaryHeld: false });
      }
    }
  }

  let remaining = context.dtSeconds;
  // Positive durations guarantee progress; cap is defensive against malformed phase data.
  for (let transitions = 0; remaining > 0 && transitions < 8; transitions++) {
    if (next.phase === "anticipation") {
      next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining });
      remaining = 0;
    } else if (next.phase === "windup") {
      const left = SWORD_LIGHT_WINDUP_SECONDS - next.elapsedSeconds;
      if (!reachesBoundary(remaining, left)) {
        next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining }); remaining = 0;
      } else {
        remaining = Math.max(0, remaining - left);
        next = freezeState({ ...next, phase: "active", elapsedSeconds: 0 });
        attacks.push(makeAttack(next.attackId!));
      }
    } else if (next.phase === "active") {
      const left = SWORD_LIGHT_ACTIVE_SECONDS - next.elapsedSeconds;
      if (!reachesBoundary(remaining, left)) {
        next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining }); remaining = 0;
      } else {
        remaining = Math.max(0, remaining - left);
        next = freezeState({ ...next, phase: "recovery", elapsedSeconds: 0 });
      }
    } else if (next.phase === "recovery") {
      const left = SWORD_LIGHT_RECOVERY_SECONDS - next.elapsedSeconds;
      if (!reachesBoundary(remaining, left)) {
        next = freezeState({ ...next, elapsedSeconds: next.elapsedSeconds + remaining }); remaining = 0;
      } else {
        remaining = Math.max(0, remaining - left);
        next = createSwordState();
      }
    } else remaining = 0;
  }
  return Object.freeze({ state: next, attacks: Object.freeze(attacks), events: Object.freeze(events) });
}

/** Cancellation clears pending input without turning it into release; committed costs are external and remain spent. */
export function cancelSword(state: SwordState, _reason: InputCancellationReason): SwordState {
  validateState(state);
  return createSwordState();
}

function makeAttack(attackId: string): AttackRequest {
  return Object.freeze({ attackId, weaponClass: "sword", kind: "sword-light", phase: "active-hit", damage: SWORD_LIGHT_DAMAGE, costCommitmentId: attackId });
}

function freezeState(state: SwordState): SwordState { return Object.freeze(state); }

function reachesBoundary(remaining: number, phaseRemaining: number): boolean {
  return remaining >= phaseRemaining || phaseRemaining - remaining <= Number.EPSILON * 8;
}

function validateState(state: SwordState): void {
  if (!state || state.weaponClass !== "sword" || !["idle", "anticipation", "windup", "active", "recovery"].includes(state.phase) ||
    !Number.isFinite(state.elapsedSeconds) || state.elapsedSeconds < 0 || typeof state.primaryHeld !== "boolean" ||
    (state.attackId !== null && (typeof state.attackId !== "string" || !state.attackId))) {
    throw new TypeError("Sword state must have a known phase, finite nonnegative seconds, held flag, and optional attack ID");
  }
}
