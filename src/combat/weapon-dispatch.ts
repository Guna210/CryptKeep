import type { GameCommand } from "../core/commands";
import { recordStaminaSpend, spendResource, type ResourceRegenTimers, type ResourceValue } from "../player/resources";
import type { AttackRequest, CurrentWeapon, StaminaCommitResult, WeaponEvent, WeaponState, WeaponUpdateResult } from "../weapons/types";

export interface WeaponRuntime {
  readonly runtimeId: string;
  readonly nextSequence: number;
  readonly committedAttackIds: readonly string[];
}

export interface WeaponDispatchInput<S extends WeaponState = WeaponState> {
  readonly weapon: CurrentWeapon<S>;
  readonly state: S;
  readonly command: GameCommand;
  readonly dtSeconds: number;
  readonly stamina: ResourceValue;
  readonly regenTimers: ResourceRegenTimers;
  readonly runtime: WeaponRuntime;
}

export interface WeaponDispatchResult<S extends WeaponState = WeaponState> {
  readonly state: S;
  readonly attacks: readonly AttackRequest[];
  readonly events: readonly WeaponEvent[];
  readonly stamina: ResourceValue;
  readonly regenTimers: ResourceRegenTimers;
  readonly runtime: WeaponRuntime;
}

export function createWeaponRuntime(runtimeId: string): WeaponRuntime {
  if (typeof runtimeId !== "string" || !runtimeId.trim()) throw new TypeError("Weapon runtime ID must be nonempty");
  return Object.freeze({ runtimeId, nextSequence: 0, committedAttackIds: Object.freeze([]) });
}

/** Runs one class update against shared player stamina and an exact-once runtime ledger. */
export function dispatchWeapon<S extends WeaponState>(input: WeaponDispatchInput<S>): WeaponDispatchResult<S> {
  if (input.weapon.weaponClass !== input.state.weaponClass) throw new TypeError("Weapon implementation and state class must match");
  if (!Number.isFinite(input.dtSeconds) || input.dtSeconds < 0) throw new RangeError("Weapon dt must be finite nonnegative simulation seconds");
  validateRuntime(input.runtime);
  let stamina = input.stamina;
  let regenTimers = input.regenTimers;
  let sequence = input.runtime.nextSequence;
  const committed = new Set(input.runtime.committedAttackIds);
  const transactionEvents: WeaponEvent[] = [];
  const context = Object.freeze({
    dtSeconds: input.dtSeconds,
    get stamina() { return stamina; },
    nextAttackId: () => {
      if (!Number.isSafeInteger(sequence)) throw new RangeError("Weapon attack sequence exhausted the safe integer range");
      return `${input.runtime.runtimeId}:${sequence++}`;
    },
    commitStamina: (attackId: string, amount: number): StaminaCommitResult => {
      if (!isIssuedRuntimeAttackId(attackId, input.runtime.runtimeId, sequence)) {
        const result = Object.freeze({ accepted: false, reason: "invalid-cost" as const, stamina });
        transactionEvents.push(Object.freeze({ type: "attack-rejected", reason: result.reason, attackId }));
        return result;
      }
      if (committed.has(attackId)) {
        const result = Object.freeze({ accepted: false, reason: "duplicate-commitment" as const, stamina });
        transactionEvents.push(Object.freeze({ type: "attack-rejected", reason: result.reason, attackId }));
        return result;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        const result = Object.freeze({ accepted: false, reason: "invalid-cost" as const, stamina });
        transactionEvents.push(Object.freeze({ type: "attack-rejected", reason: result.reason, attackId }));
        return result;
      }
      const spent = spendResource(stamina, amount);
      if (!spent.success) {
        const result = Object.freeze({ accepted: false, reason: "insufficient-resource" as const, stamina });
        transactionEvents.push(Object.freeze({ type: "attack-rejected", reason: result.reason, attackId }));
        return result;
      }
      stamina = spent.resource;
      regenTimers = recordStaminaSpend(regenTimers);
      committed.add(attackId);
      transactionEvents.push(Object.freeze({ type: "attack-committed", attackId, staminaCost: amount }));
      return Object.freeze({ accepted: true, stamina });
    },
  });

  // clearInput removes stale edges before it reports cancellation. Cancel the previous state,
  // then process any fresh valid edges that arrived after that clear; never synthesize a release.
  let startingState = input.state;
  if (input.command.cancellations.length) {
    for (const reason of input.command.cancellations) startingState = input.weapon.cancel(startingState, reason);
  }
  const updateCommand = input.command.cancellations.length
    ? Object.freeze({ ...input.command, cancellations:Object.freeze([]) }) : input.command;
  const update: WeaponUpdateResult<S> = input.weapon.update(startingState, updateCommand, context);
  const attacks = update.attacks.filter((attack) => attack.phase === "active-hit" &&
    attack.attackId === attack.costCommitmentId && committed.has(attack.costCommitmentId));
  return Object.freeze({ state: update.state, attacks: Object.freeze(attacks),
    events: Object.freeze([...transactionEvents, ...update.events]), stamina,
    regenTimers, runtime: Object.freeze({ runtimeId: input.runtime.runtimeId, nextSequence: sequence, committedAttackIds: Object.freeze([...committed]) }) });
}

function validateRuntime(runtime: WeaponRuntime): void {
  if (!runtime || typeof runtime.runtimeId !== "string" || !runtime.runtimeId.trim() ||
    !Number.isSafeInteger(runtime.nextSequence) || runtime.nextSequence < 0 || !Array.isArray(runtime.committedAttackIds)) {
    throw new TypeError("Weapon runtime requires a nonempty ID, finite nonnegative sequence, and committed ID array");
  }
  const seen = new Set<string>();
  for (const id of runtime.committedAttackIds) {
    if (typeof id !== "string" || !isIssuedRuntimeAttackId(id, runtime.runtimeId, runtime.nextSequence) || seen.has(id)) {
      throw new TypeError("Committed attack IDs must be unique IDs issued by this runtime");
    }
    seen.add(id);
  }
}

function isIssuedRuntimeAttackId(id: string, runtimeId: string, nextSequence: number): boolean {
  if (typeof id !== "string" || !id.startsWith(`${runtimeId}:`)) return false;
  const suffix = id.slice(runtimeId.length + 1);
  if (!/^\d+$/.test(suffix)) return false;
  const issuedSequence = Number(suffix);
  return Number.isSafeInteger(issuedSequence) && issuedSequence >= 0 && issuedSequence < nextSequence;
}
