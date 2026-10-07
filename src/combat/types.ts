import type { ResourceValue } from "../player/resources";

/** Stable simulation identity and relationship data needed by the first damage pipeline. */
export interface CombatantIdentity {
  readonly id: string;
  readonly team: string;
}

export interface DamageableCombatant extends CombatantIdentity {
  readonly health: ResourceValue;
}

/** CK-03-01 supports direct physical damage only. Later pipelines may extend the tagged union. */
export interface PhysicalDamagePacket {
  readonly sourceId: string;
  readonly targetId: string;
  readonly attackId: string;
  readonly damageType: "physical";
  readonly amount: number;
}

export type DamageResult =
  | Readonly<{ applied: false; reason: "invalid-packet" | "identity-mismatch" | "friendly-fire" | "already-hit" | "dead-target"; target: DamageableCombatant }>
  | Readonly<{ applied: true; amount: number; killed: boolean; target: DamageableCombatant }>;
