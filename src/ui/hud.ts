import type { EventCollector } from "../core/events";
import { CombatFeedback, hurtOpacity, type FeedbackSnapshot } from "../render/feedback";
import type { ResourceValue } from "../player/resources";
import type { SwordState } from "../weapons/sword";
import { swordChargeFraction } from "../weapons/sword";
import "./hud.css";

export interface HudSnapshot {
  readonly health: ResourceValue;
  readonly stamina: ResourceValue;
  readonly mana: ResourceValue;
  readonly sword: SwordState;
}
export interface HudOptions { readonly damageFlashesEnabled?: boolean; }
export interface CombatHud {
  update(snapshot: HudSnapshot): void;
  advance(dtSeconds: number, paused?: boolean): void;
  setDamageFlashesEnabled(enabled: boolean): void;
  resetFeedback(): void;
  dispose(): void;
}

/** Mount one DOM-owned HUD. Caller retains the collector, snapshots, and simulation tick. */
export function createCombatHud(host: HTMLElement, playerId: string, collector: EventCollector, options: HudOptions = {}): CombatHud {
  const root = document.createElement("section"); root.className = "ck-hud"; root.setAttribute("aria-label", "Player status");
  root.innerHTML = `<div class="ck-hud__resources"></div><div class="ck-hud__reticle" aria-hidden="true">+</div><div class="ck-hud__charge" hidden><span>SWORD</span><div class="ck-hud__track"><i></i></div></div><div class="ck-hud__hit" aria-hidden="true">×</div><div class="ck-hud__hurt" aria-hidden="true"></div>`;
  const resources = root.querySelector<HTMLElement>(".ck-hud__resources")!;
  const charge = root.querySelector<HTMLElement>(".ck-hud__charge")!;
  const chargeBar = charge.querySelector<HTMLElement>("i")!;
  const hit = root.querySelector<HTMLElement>(".ck-hud__hit")!;
  const hurt = root.querySelector<HTMLElement>(".ck-hud__hurt")!;
  host.append(root);
  let renderFeedback: (state: FeedbackSnapshot) => void = () => {};
  const feedback = new CombatFeedback(collector, playerId, options, (state) => renderFeedback(state));
  let disposed = false;
  const check = () => { if (disposed) throw new Error("combat HUD is disposed"); };
  renderFeedback = (state: FeedbackSnapshot) => {
    hit.classList.toggle("is-visible", state.hitMarkerSeconds > 0);
    hurt.style.opacity = String(hurtOpacity(state));
  };
  return {
    update(snapshot) {
      check();
      resources.replaceChildren(...([ ["HP", snapshot.health], ["STA", snapshot.stamina], ["MP", snapshot.mana] ] as const).map(([label, value]) => {
        const safeMax = finiteNonnegative(value.maximum), safeCurrent = Math.min(safeMax, finiteNonnegative(value.current));
        const ratio = safeMax > 0 ? safeCurrent / safeMax : 0;
        const row = document.createElement("div"); row.className = "ck-hud__resource";
        row.dataset.resource = label.toLowerCase();
        if (label === "HP" && safeMax > 0 && safeCurrent > 0 && ratio <= 0.25) row.classList.add("is-low");
        const text = document.createElement("span"); text.textContent = `${label} ${safeCurrent} / ${safeMax}`;
        const track = document.createElement("div"); track.className = "ck-hud__track"; track.setAttribute("role", "meter"); track.setAttribute("aria-label", `${label} resource`); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", String(safeMax)); track.setAttribute("aria-valuenow", String(safeCurrent));
        const fill = document.createElement("i"); fill.style.width = `${ratio * 100}%`; track.append(fill); row.append(text, track); return row;
      }));
      const fraction = finiteClamp(swordChargeFraction(snapshot.sword), 0, 1);
      charge.hidden = !(snapshot.sword.phase === "anticipation" && snapshot.sword.primaryHeld);
      chargeBar.style.width = `${fraction * 100}%`;
    },
    advance(dtSeconds, paused = false) { check(); renderFeedback(feedback.advance(dtSeconds, paused)); },
    setDamageFlashesEnabled(enabled) { check(); feedback.setDamageFlashesEnabled(enabled); renderFeedback(feedback.snapshot()); },
    resetFeedback() { check(); feedback.reset(); renderFeedback(feedback.snapshot()); },
    dispose() { if (disposed) return; disposed = true; feedback.dispose(); root.remove(); },
  };
}
function finiteNonnegative(value: number): number { return Number.isFinite(value) ? Math.max(0, value) : 0; }
function finiteClamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)); }
