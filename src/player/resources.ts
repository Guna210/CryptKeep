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

/** Create a detached, bounded resource value; malformed limits are programmer errors. */
export function createResource(current: number, maximum: number): ResourceValue {
  if (!Number.isFinite(maximum) || maximum < 0) {
    throw new RangeError("Resource maximum must be a finite nonnegative number");
  }
  return Object.freeze({ maximum, current: clampResource(current, maximum) });
}

/** Clamp finite values into [0, maximum], treating non-finite values as zero. */
export function clampResource(value: number, maximum: number): number {
  if (!Number.isFinite(maximum) || maximum < 0) {
    throw new RangeError("Resource maximum must be a finite nonnegative number");
  }
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
  if (!Number.isFinite(amount) || amount <= 0) {
    return Object.freeze({ success: false, reason: "invalid-amount", resource: Object.freeze({ ...resource }) });
  }
  if (amount > resource.current) {
    return Object.freeze({ success: false, reason: "insufficient-resource", resource: Object.freeze({ ...resource }) });
  }
  return Object.freeze({ success: true, resource: createResource(resource.current - amount, resource.maximum) });
}

function assertResource(resource: ResourceValue): void {
  if (!resource || typeof resource !== "object" || !Number.isFinite(resource.maximum) || resource.maximum < 0 ||
    !Number.isFinite(resource.current) || resource.current < 0 || resource.current > resource.maximum) {
    throw new TypeError("Resource must have a finite current value bounded by a finite nonnegative maximum");
  }
}
