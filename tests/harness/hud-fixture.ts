import { EventCollector } from "../../src/core/events";
import { PhysicalDamageResolver } from "../../src/combat/damage";
import type { CombatantIdentity, DamageableCombatant } from "../../src/combat/types";
import { createResource } from "../../src/player/resources";
import { createCombatHud, type HudSnapshot } from "../../src/ui/hud";
import { createSwordState, type SwordState } from "../../src/weapons/sword";

const PLAYER = "hud-player", TARGET = "hud-target", ENEMY = "hud-enemy";
const host = document.querySelector<HTMLElement>("#fixture")!;
const events = new EventCollector();
let activeSubscriptions = 0;
const originalSubscribe = events.subscribe.bind(events);
events.subscribe = (listener) => { activeSubscriptions++; const unsubscribe = originalSubscribe(listener); let active = true; return () => { if (active) { active = false; activeSubscriptions--; } unsubscribe(); }; };
const resolver = new PhysicalDamageResolver(events);
const playerIdentity: CombatantIdentity = Object.freeze({ id: PLAYER, team: "players" });
const enemyIdentity: CombatantIdentity = Object.freeze({ id: ENEMY, team: "enemies" });
let player: DamageableCombatant = Object.freeze({ id: PLAYER, team: "players", health: createResource(100, 100) });
let target: DamageableCombatant = Object.freeze({ id: TARGET, team: "enemies", health: createResource(100, 100) });
let tick = 0, attack = 0, low = false, charging = false, flashes = true, paused = false, disposed = false;
const initial: HudSnapshot = Object.freeze({ health: createResource(100, 100), stamina: createResource(75, 100), mana: createResource(42, 60), sword: createSwordState() });
let snapshot = initial;
const hud = createCombatHud(host, PLAYER, events, { damageFlashesEnabled: flashes });
function chargeState(): SwordState { return Object.freeze({ ...createSwordState(), phase: "anticipation", elapsedSeconds: 0.725, primaryHeld: true }); }
function update(): void { hud.update(snapshot); }
function resolve(source: CombatantIdentity, targetValue: DamageableCombatant, packetTarget: string): void {
  events.beginTick(tick++);
  const result = resolver.resolve(source, targetValue, { sourceId: source.id, targetId: packetTarget, attackId: `hud-${attack++}`, damageType: "physical", amount: 10 });
  if (result.applied && packetTarget === PLAYER) player = result.target;
  if (result.applied && packetTarget === TARGET) target = result.target;
  events.flush();
}
document.querySelector("#outgoing")!.addEventListener("click", () => resolve(playerIdentity, target, TARGET));
document.querySelector("#incoming")!.addEventListener("click", () => {
  resolve(enemyIdentity, player, PLAYER);
  snapshot = Object.freeze({ ...snapshot, health: player.health }); update();
});
document.querySelector("#irrelevant")!.addEventListener("click", () => resolve(enemyIdentity, target, TARGET));
document.querySelector("#charge")!.addEventListener("click", () => { charging = !charging; snapshot = Object.freeze({ ...snapshot, sword: charging ? chargeState() : createSwordState() }); update(); });
document.querySelector("#low")!.addEventListener("click", () => { low = !low; snapshot = Object.freeze({ ...snapshot, health: createResource(low ? 25 : 100, 100) }); update(); });
document.querySelector("#zero-hp")!.addEventListener("click", () => { snapshot = Object.freeze({ ...snapshot, health: createResource(0, 100) }); update(); });
document.querySelector("#zero-max")!.addEventListener("click", () => { snapshot = Object.freeze({ ...snapshot, mana: createResource(0, 0) }); update(); });
document.querySelector("#restore")!.addEventListener("click", () => { snapshot = Object.freeze({ ...snapshot, health: createResource(100, 100), mana: createResource(42, 60) }); update(); });
document.querySelector("#flash")!.addEventListener("click", () => { flashes = !flashes; hud.setDamageFlashesEnabled(flashes); document.querySelector("#flash")!.textContent = flashes ? "Disable flashes" : "Enable flashes"; });
document.querySelector("#tick")!.addEventListener("click", () => hud.advance(0.26, paused));
document.querySelector("#freeze")!.addEventListener("click", () => { paused = true; hud.advance(1, true); paused = false; });
interface Fixture { updateMany: (count: number) => void; activeSubscriptions: () => number; dispose: () => void; emitIncoming: () => void; }
declare global { interface Window { hudFixture: Fixture } }
window.hudFixture = {
  updateMany(count) { for (let i = 0; i < count; i++) update(); },
  activeSubscriptions: () => activeSubscriptions,
  emitIncoming() { resolve(enemyIdentity, player, PLAYER); },
  dispose() { if (disposed) return; disposed = true; hud.dispose(); hud.dispose(); },
};
update();
