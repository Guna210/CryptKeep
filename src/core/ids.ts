import { normalizeSeed } from "./rng";

/** Stable value identity from normalized campaign seed, floor, domain and spawn ordinal. */
export function stableId(seed: string, floor: number, domain: string, spawnOrdinal: number): string {
  const campaignSeed = normalizeSeed(seed);
  if (!Number.isSafeInteger(floor) || floor < 1 || floor > 100) {
    throw new RangeError("Floor must be an integer from 1 through 100");
  }
  if (typeof domain !== "string") throw new TypeError("ID domain must be a string");
  const normalizedDomain = domain.normalize("NFC");
  if (normalizedDomain.length === 0) throw new RangeError("ID domain must not be empty");
  if (!Number.isSafeInteger(spawnOrdinal) || spawnOrdinal < 0) {
    throw new RangeError("Spawn ordinal must be a nonnegative safe integer");
  }

  // JSON tuple encoding preserves component boundaries even when values contain delimiters.
  return `ckid:${JSON.stringify([campaignSeed, floor, normalizedDomain, spawnOrdinal])}`;
}
