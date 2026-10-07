import { adjustResource } from "../player/resources";
import type { EventCollector } from "../core/events";
import type { CombatantIdentity, DamageableCombatant, DamageResult, PhysicalDamagePacket } from "./types";

/**
 * Own one resolver for one runtime combat instance. Its attack/target ledger is
 * intentionally finite to that instance: create a new resolver when replacing
 * the combat runtime (for example, when a floor session is retired). An attack
 * can hit many targets, but each target is recorded once; nonlethal hits count.
 */
export class PhysicalDamageResolver {
  private readonly hitsByAttack = new Map<string, Set<string>>();
  private readonly deadTargetIds = new Set<string>();

  constructor(private readonly events?: EventCollector) {}

  resolve(source: CombatantIdentity, target: DamageableCombatant, packet: PhysicalDamagePacket): DamageResult {
    if (!validIdentity(source) || !validIdentity(target) || !validPacket(packet)) {
      return rejected("invalid-packet", target);
    }
    if (source.id !== packet.sourceId || target.id !== packet.targetId) return rejected("identity-mismatch", target);
    if (source.id === target.id || source.team === target.team) return rejected("friendly-fire", target);
    if (target.health.current <= 0 || this.deadTargetIds.has(target.id)) return rejected("dead-target", target);

    const hitTargets = this.hitsByAttack.get(packet.attackId);
    if (hitTargets?.has(target.id)) return rejected("already-hit", target);

    const health = adjustResource(target.health, -Math.max(1, packet.amount));
    const amount = target.health.current - health.current;
    // Positive finite packet and living target ensure actual HP loss is positive.
    const updatedTarget = Object.freeze({ ...target, health });
    const killed = health.current === 0;
    if (hitTargets) hitTargets.add(target.id);
    else this.hitsByAttack.set(packet.attackId, new Set([target.id]));
    if (killed) this.deadTargetIds.add(target.id);

    this.events?.emit({
      type: "damage-applied", sourceId: source.id, targetId: target.id,
      attackId: packet.attackId, damageType: "physical", amount, hpRemaining: health.current,
    });
    if (killed) {
      this.events?.emit({
        type: "entity-died", sourceId: source.id, targetId: target.id,
        attackId: packet.attackId, damageType: "physical",
      });
    }
    return Object.freeze({ applied: true, amount, killed, target: updatedTarget });
  }
}

function validIdentity(value: CombatantIdentity): boolean {
  return typeof value?.id === "string" && value.id.trim().length > 0
    && typeof value?.team === "string" && value.team.trim().length > 0;
}

function validPacket(packet: PhysicalDamagePacket): boolean {
  return typeof packet?.sourceId === "string" && packet.sourceId.trim().length > 0
    && typeof packet?.targetId === "string" && packet.targetId.trim().length > 0
    && typeof packet?.attackId === "string" && packet.attackId.trim().length > 0
    && packet.damageType === "physical" && Number.isFinite(packet.amount) && packet.amount > 0;
}

function rejected(reason: Extract<DamageResult, { applied: false }>['reason'], target: DamageableCombatant): DamageResult {
  return Object.freeze({ applied: false, reason, target: Object.freeze({ ...target, health: target.health }) });
}
