/**
 * Seeded xoshiro128** streams. Each initial word is FNV-1a of the JSON encoding
 * `[JSON([normalizedSeed, domain, source]), "cryptkeep-rng-v1", wordIndex]`.
 * FNV-1a starts at 0x811c9dc5 and multiplies by 0x01000193 modulo 2^32 per UTF-8 byte.
 * This versioned, length-safe encoding keeps domain/source names independent.
 * xoshiro128** is the reference transition by Blackman and Vigna; the all-zero state is invalid.
 * Named domains should keep gameplay independent (`layout`, `roomroles`, `encounters`,
 * `enemy`, `boss`, `containers`, `enemyloot`, `combat`) from `cosmetics`.
 */

export const MAX_SEED_CHARACTERS = 64;
const UINT32_RANGE = 0x1_0000_0000;
const UINT32_MASK = 0xffff_ffff;

export interface RngCursor {
  algorithm: "xoshiro128**";
  state: [number, number, number, number];
}

/** Trim and NFC-normalize a user seed. Length means Unicode code points after normalization.
 * Lone UTF-16 surrogates are retained; TextEncoder deterministically encodes each as U+FFFD.
 * Empty strings are valid and are useful for the later new-campaign entropy boundary.
 */
export function normalizeSeed(seed: string): string {
  if (typeof seed !== "string") throw new TypeError("Seed must be a string");
  const normalized = seed.trim().normalize("NFC");
  if ([...normalized].length > MAX_SEED_CHARACTERS) {
    throw new RangeError(`Seed must contain at most ${MAX_SEED_CHARACTERS} Unicode code points`);
  }
  return normalized;
}

/** 32-bit FNV-1a over UTF-8 bytes. */
export function fnv1aUtf8(value: string): number {
  if (typeof value !== "string") throw new TypeError("FNV input must be a string");
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// JSON arrays encode component boundaries unambiguously (including quotes and separators).
function canonical(parts: readonly string[]): string {
  return JSON.stringify(parts);
}

function initialState(seed: string, domain: string, source: string): [number, number, number, number] {
  const root = canonical([normalizeSeed(seed), domain, source]);
  const state = [0, 1, 2, 3].map((index) =>
    fnv1aUtf8(canonical([root, "cryptkeep-rng-v1", String(index)])),
  ) as [number, number, number, number];
  if (state.every((word) => word === 0)) state[0] = 0x9e3779b9;
  return state;
}

function validateComponent(value: string, label: string): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`);
  if (value.length === 0) throw new RangeError(`${label} must not be empty`);
  return value.normalize("NFC");
}

/** Derive independent domain/source streams; e.g. layout, enemy/<stable source>, cosmetics, combat. */
export function deriveStream(seed: string, domain: string, source = "root"): SeededRng {
  const normalizedSeed = normalizeSeed(seed);
  return new SeededRng(initialState(normalizedSeed, validateComponent(domain, "Domain"), validateComponent(source, "Source")));
}

function rotateLeft(value: number, count: number): number {
  return ((value << count) | (value >>> (32 - count))) >>> 0;
}

/** xoshiro128** reference transition, returning the pre-transition output. */
export class SeededRng {
  private state: [number, number, number, number];

  constructor(state: readonly number[]) {
    this.state = validateState(state);
  }

  static fromSeed(seed: string, domain = "gameplay", source = "root"): SeededRng {
    return deriveStream(seed, domain, source);
  }

  nextUint32(): number {
    const [s0, s1, s2, s3] = this.state;
    const result = Math.imul(rotateLeft(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    // Preserve the sequential dependencies in the reference transition.
    let next0 = s0;
    let next1 = s1;
    let next2 = s2;
    let next3 = s3;
    next2 ^= next0;
    next3 ^= next1;
    next1 ^= next2;
    next0 ^= next3;
    next2 ^= t;
    next3 = rotateLeft(next3, 11);
    this.state = [next0 >>> 0, next1 >>> 0, next2 >>> 0, next3 >>> 0];
    return result;
  }

  /** Uniform double in [0, 1), using all 32 output bits. */
  nextFloat(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** Uniform integer in [minInclusive, maxExclusive), via rejection sampling. */
  nextInt(minInclusive: number, maxExclusive: number): number {
    if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive)) {
      throw new TypeError("Integer bounds must be safe integers");
    }
    const span = maxExclusive - minInclusive;
    if (span <= 0 || span > UINT32_RANGE) throw new RangeError("Integer range must be in 1..2^32");
    const limit = Math.floor(UINT32_RANGE / span) * span;
    let value: number;
    do value = this.nextUint32(); while (value >= limit);
    return minInclusive + (value % span);
  }

  /** Fresh plain-data copy. Mutating it cannot change this stream. */
  snapshot(): RngCursor {
    return { algorithm: "xoshiro128**", state: [...this.state] as [number, number, number, number] };
  }

  static restore(cursor: unknown): SeededRng {
    if (typeof cursor !== "object" || cursor === null || Object.getPrototypeOf(cursor) !== Object.prototype) {
      throw new TypeError("Invalid RNG cursor");
    }
    const record = cursor as Partial<RngCursor>;
    if (Object.keys(record).length !== 2 || !Object.hasOwn(record, "algorithm") || !Object.hasOwn(record, "state")) {
      throw new TypeError("RNG cursor must contain only algorithm and state");
    }
    if (record.algorithm !== "xoshiro128**") throw new TypeError("Unsupported RNG cursor algorithm");
    if (!Array.isArray(record.state) || Object.getPrototypeOf(record.state) !== Array.prototype ||
      Object.keys(record.state).length !== 4) {
      throw new TypeError("RNG cursor state must be a plain four-word array");
    }
    return new SeededRng(record.state as number[]);
  }
}

function validateState(state: readonly number[]): [number, number, number, number] {
  if (!Array.isArray(state) || state.length !== 4) {
    throw new TypeError("RNG state must contain exactly four unsigned 32-bit integers");
  }
  const copy: [number, number, number, number] = [0, 0, 0, 0];
  for (let index = 0; index < 4; index += 1) {
    if (!Object.hasOwn(state, index)) throw new TypeError("RNG state cannot contain missing words");
    const word = state[index];
    if (typeof word !== "number" || !Number.isInteger(word) || word < 0 || word > UINT32_MASK) {
      throw new TypeError("RNG state must contain exactly four unsigned 32-bit integers");
    }
    copy[index] = word >>> 0;
  }
  if (copy.every((word) => word === 0)) throw new RangeError("RNG state must not be all zero");
  return copy;
}
