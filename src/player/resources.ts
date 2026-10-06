/** Bounded values used by player resources and future resource extensions. */
export interface ResourceValue {
  readonly current: number;
  readonly maximum: number;
}

export type SpendFailureReason = "invalid-amount" | "insufficient-resource";
export type SpendResult =
  | Readonly<{ success: true; resource: ResourceValue }>
  | Readonly<{ success: false; reason: SpendFailureReason; resource: ResourceValue }>;

export const INITIAL_HEALTH = 100;
export const INITIAL_STAMINA = 100;
export const INITIAL_MANA = 60;
export const STAMINA_REGEN_DELAY_SECONDS = 0.65;
export const STAMINA_REGEN_PER_SECOND = 22;
export const MANA_REGEN_DELAY_SECONDS = 1;
export const MANA_REGEN_PER_SECOND = 6;

/** Plain simulation-time bookkeeping. Pass this same value to future stamina consumers such as dash. */
export interface ResourceRegenTimers {
  readonly staminaIdleSeconds: number;
  readonly manaIdleSeconds: number;
}
export interface RegeneratingResources {
  readonly health: ResourceValue;
  readonly stamina: ResourceValue;
  readonly mana: ResourceValue;
  readonly timers: ResourceRegenTimers;
}
export interface ResourceSpendFlags {
  readonly staminaSpent?: boolean;
  readonly manaSpent?: boolean;
  readonly active?: boolean;
}

export function createResourceRegenTimers(): ResourceRegenTimers {
  return Object.freeze({ staminaIdleSeconds: 0, manaIdleSeconds: 0 });
}

/**
 * Advance resources using simulation seconds only. A spend tick resets its own timer
 * and cannot regenerate. Inactive ticks freeze values and timers. Invalid/nonpositive
 * dt is rejected so callers cannot accidentally advance with wall-clock milliseconds.
 */
export function advanceResourceRegeneration(
  resources: Pick<RegeneratingResources, "health" | "stamina" | "mana">,
  timers: ResourceRegenTimers,
  dtSeconds: number,
  flags: ResourceSpendFlags = {},
): RegeneratingResources {
  assertTimers(timers);
  assertResources(resources);
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) throw new RangeError("dtSeconds must be finite and positive simulation seconds");
  if (flags.active === false) return Object.freeze({ ...resources, timers: Object.freeze({ ...timers }) });
  const staminaIdleSeconds = flags.staminaSpent ? 0 : timers.staminaIdleSeconds + dtSeconds;
  const manaIdleSeconds = flags.manaSpent ? 0 : timers.manaIdleSeconds + dtSeconds;
  const staminaElapsed = flags.staminaSpent ? 0 : Math.max(0, staminaIdleSeconds - STAMINA_REGEN_DELAY_SECONDS) - Math.max(0, timers.staminaIdleSeconds - STAMINA_REGEN_DELAY_SECONDS);
  const manaElapsed = flags.manaSpent ? 0 : Math.max(0, manaIdleSeconds - MANA_REGEN_DELAY_SECONDS) - Math.max(0, timers.manaIdleSeconds - MANA_REGEN_DELAY_SECONDS);
  return Object.freeze({
    health: Object.freeze({ ...resources.health }),
    stamina: adjustResource(resources.stamina, staminaElapsed * STAMINA_REGEN_PER_SECOND),
    mana: adjustResource(resources.mana, manaElapsed * MANA_REGEN_PER_SECOND),
    timers: Object.freeze({ staminaIdleSeconds, manaIdleSeconds }),
  });
}

/** Reset the shared stamina delay after any accepted stamina cost (for CK-02-07 dash). */
export function recordStaminaSpend(timers: ResourceRegenTimers): ResourceRegenTimers {
  assertTimers(timers);
  return Object.freeze({ ...timers, staminaIdleSeconds: 0 });
}

/** Create a detached, bounded resource value; malformed limits are programmer errors. */
export function createResource(current: number, maximum: number): ResourceValue {
  if (!Number.isFinite(maximum) || maximum < 0) throw new RangeError("Resource maximum must be a finite nonnegative number");
  return Object.freeze({ maximum, current: clampResource(current, maximum) });
}

/** Clamp finite values into [0, maximum], treating non-finite values as zero. */
export function clampResource(value: number, maximum: number): number {
  if (!Number.isFinite(maximum) || maximum < 0) throw new RangeError("Resource maximum must be a finite nonnegative number");
  if (!Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, value));
}

/** Set a resource to a requested value while preserving its validated maximum. */
export function setResource(resource: ResourceValue, value: number): ResourceValue {
  assertResource(resource);
  return createResource(value, resource.maximum);
}

/** Add a finite amount (positive or negative) and clamp at both bounds. */
export function adjustResource(resource: ResourceValue, amount: number): ResourceValue {
  assertResource(resource);
  if (!Number.isFinite(amount)) return Object.freeze({ ...resource });
  return createResource(resource.current + amount, resource.maximum);
}

/** Spend a strictly positive finite amount; failure leaves the input unchanged. */
export function spendResource(resource: ResourceValue, amount: number): SpendResult {
  assertResource(resource);
  if (!Number.isFinite(amount) || amount <= 0) return Object.freeze({ success: false, reason: "invalid-amount", resource: Object.freeze({ ...resource }) });
  if (amount > resource.current) return Object.freeze({ success: false, reason: "insufficient-resource", resource: Object.freeze({ ...resource }) });
  return Object.freeze({ success: true, resource: createResource(resource.current - amount, resource.maximum) });
}

function assertResources(resources: Pick<RegeneratingResources, "health" | "stamina" | "mana">): void {
  assertResource(resources.health); assertResource(resources.stamina); assertResource(resources.mana);
}
function assertTimers(timers: ResourceRegenTimers): void {
  if (!timers || !Number.isFinite(timers.staminaIdleSeconds) || timers.staminaIdleSeconds < 0 || !Number.isFinite(timers.manaIdleSeconds) || timers.manaIdleSeconds < 0) {
    throw new TypeError("Resource regeneration timers must be finite nonnegative simulation seconds");
  }
}
function assertResource(resource: ResourceValue): void {
  if (!resource || typeof resource !== "object" || !Number.isFinite(resource.maximum) || resource.maximum < 0 || !Number.isFinite(resource.current) || resource.current < 0 || resource.current > resource.maximum) {
    throw new TypeError("Resource must have a finite current value bounded by a finite nonnegative maximum");
  }
}
