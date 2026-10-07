import "./ui/shell.css";
import { createAppShell } from "./app/shell";
import { FloorSession } from "./app/floor-session";
import { PlayerSession } from "./app/player-session";
import { PauseCoordinator } from "./app/pause";
import { createMinimalPauseUI } from "./ui/pause-minimal";
import { createRenderedFloor, createRenderedGrid } from "./render/floor";
import { createMaterialLibrary } from "./render/materials";
import { createWorldRenderer } from "./render/renderer";
import { createRenderScheduler } from "./render/render-scheduler";
import { installDiagnostics, type AppReadiness } from "./debug";
import { createSwordViewmodel, type ViewmodelController } from "./render/viewmodel";
import { createCombatHud, type CombatHud } from "./ui/hud";
import { CombatSession, type CombatActor } from "./app/combat-session";
import type { Grid } from "./dungeon/types";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("CryptKeep application root is missing.");
const appRoot:HTMLElement=root;
const shell = createAppShell(root);
let readiness: AppReadiness = shell.context ? "initializing" : "unsupported";
let world: ReturnType<typeof createWorldRenderer> | null = null;
let session: FloorSession | null = null;
let player: PlayerSession | null = null;
let combat: CombatSession | null = null;
let hud: CombatHud | null = null;
let swordModel: ViewmodelController | null = null;
let targetView: {update(health:number,maximum:number):void;dispose():void} | null = null;
let trainingToolbar:HTMLElement|null=null;
const trainingButtons:HTMLButtonElement[]=[];
const trainingButtonCleanups:Array<()=>void>=[];
let worldRequest=0;
let raf = 0;
let stopped = false;
const renderScheduler=createRenderScheduler();
let form: HTMLFormElement | null = null;
let formSubmitListener: ((event: SubmitEvent) => void) | null = null;
const pauseUI = createMinimalPauseUI(shell.overlay, onResume);
const pauseCoordinator = new PauseCoordinator(!shell.context, (snapshot) => {
  pauseUI.render(snapshot);
  shell.overlay.classList.toggle("cryptkeep__overlay--playing", snapshot.phase === "playing");
  shell.overlay.classList.toggle("cryptkeep__overlay--session-started", snapshot.phase === "playing" || snapshot.phase === "paused" || snapshot.phase === "requesting" || snapshot.phase === "waiting");
  shell.exploreButton.disabled = snapshot.phase !== "available";
});
const diagnostics = import.meta.env.DEV
  ? installDiagnostics(() => readiness, () => world?.getResourceCounts() ?? null, () => session?.snapshot() ?? null, () => player?.snapshot() ?? null, () => combat?.snapshot() ?? null)
  : null;
function cleanup(action: () => void): void {
  try { action(); } catch { /* Keep teardown independent across owned resources. */ }
}

function status(label: string, message: string): void {
  shell.statusLabel.textContent = label;
  shell.statusMessage.textContent = message;
}
function frame(timestamp: number): void {
  if (stopped) return;
  const result=player?.advance(timestamp);
  const playerState=player?.snapshot();
  const combatState=combat?.snapshot();
  if(playerState?.resources && combatState) hud?.update({...playerState.resources,sword:combatState.sword});
  if(result) hud?.advance(result.steps/60,!playerState?.active);
  if(combatState?.actors[0]) targetView?.update(combatState.actors[0].health.current,combatState.actors[0].health.maximum);
  if(combatState) swordModel?.update(combatState.sword);
  if (world) {
    const camera=world.camera;
    const signature=[camera.position.x,camera.position.y,camera.position.z,camera.rotation.x,camera.rotation.y,camera.rotation.z,
      combatState ? JSON.stringify(combatState.sword) : ""].join(":");
    const viewport=`${world.renderer.domElement.width}x${world.renderer.domElement.height}@${window.devicePixelRatio||1}`;
    if(renderScheduler.shouldRender(!!playerState?.active,signature,viewport,!document.hidden)) world.renderer.render(world.scene,camera);
  }
  raf = requestAnimationFrame(frame);
}
function pause(reason: "blur" | "hidden" | "pause"): void { player?.release(reason); }
function teardown(): void {
  if (stopped) return;
  stopped = true; worldRequest++;
  cleanup(() => cancelAnimationFrame(raf));
  const ownedPlayer = player; player = null;
  cleanup(() => ownedPlayer?.dispose());
  cleanup(() => hud?.dispose()); hud=null;
  cleanup(() => swordModel?.dispose()); swordModel=null;
  cleanup(() => targetView?.dispose()); targetView=null;
  cleanup(() => combat?.dispose()); combat=null;
  for(const remove of trainingButtonCleanups.splice(0)) cleanup(remove);
  trainingButtons.length=0;
  cleanup(()=>trainingToolbar?.remove()); trainingToolbar=null;
  cleanup(() => pauseCoordinator.dispose());
  cleanup(() => pauseUI.dispose());
  const ownedSession = session; session = null;
  cleanup(() => ownedSession?.dispose());
  const ownedWorld = world; world = null;
  cleanup(() => ownedWorld?.dispose());
  cleanup(() => diagnostics?.dispose());
  if (form && formSubmitListener) cleanup(() => form!.removeEventListener("submit", formSubmitListener!));
  form = null; formSubmitListener = null;
  cleanup(() => shell.exploreButton.removeEventListener("click", onExplore));
  cleanup(() => document.removeEventListener("visibilitychange", onVisibility));
  cleanup(() => window.removeEventListener("blur", onBlur));
  cleanup(() => window.removeEventListener("pagehide", teardown));
  cleanup(() => shell.dispose());
}
function onVisibility(): void { if (document.hidden) pause("hidden"); else renderScheduler.invalidate(); }
function onBlur(): void { pause("blur"); }
function setCombatWorld(grid:Grid,actors:readonly CombatActor[]=[]):void {
  if(!world||!player)return;
  const activeWorld=world;
  const playerId="player";
  if(combat) combat.setWorld(grid,actors);
  else {
    combat=new CombatSession(grid,actors,{id:playerId,team:"players"});
    player.setCombatSession(combat);
    hud=createCombatHud(appRoot,playerId,combat.events);
    swordModel=createSwordViewmodel(activeWorld);
  }
  renderScheduler.invalidate();
  hud?.resetFeedback();
}
async function showTraining(variant:"clear"|"obstructed"):Promise<void> {
  if(!import.meta.env.DEV||!session||!player||!world||stopped)return;
  const request=++worldRequest;
  player.release("pause");
  const training=await import("./debug/fixtures/native-training");
  if(stopped||request!==worldRequest)return;
  const setup=training.getNativeTraining(variant);
  const grid=session.installDiagnosticGrid(setup.grid);
  player.loadDiagnostic(grid,setup.pose);
  targetView?.dispose();
  setCombatWorld(grid,[setup.actor]);
  targetView=training.createTrainingTargetView(world,setup.actor);
  readiness="ready";
  shell.generateButton.disabled=false;shell.seedInput.disabled=false;shell.overlay.removeAttribute("aria-busy");
  const variantLabel=variant==="clear"?"clear room":"wall room";
  status("DEV TRAINING · "+variant.toUpperCase(),`Sword practice in the ${variantLabel}. Left click taps; hold and release to charge. WASD and mouse move. Escape pauses.`);
  pauseCoordinator.ready();
}

window.addEventListener("pagehide", teardown);

if (shell.context) {
  try {
    world = createWorldRenderer(shell.canvas, { context: shell.context, resizeTarget: root, includeDiagnosticFixture: false });
    session = new FloorSession(world, { createFloor:(generated, library) => createRenderedFloor(generated.plan, library, { ceilingVisible:true }), createDiagnosticFloor:(grid,library)=>createRenderedGrid(grid,library) });
    player = new PlayerSession(session, world, shell.canvas, (state, reason) => {
      if (state === "captured" && (stopped || readiness !== "ready" || document.hidden)) {
        player?.release(document.hidden ? "hidden" : "pause");
        return;
      }
      pauseCoordinator.captureChanged(state, reason);
      if (state === "captured") player?.resumeAfterCapture(performance.now());
    });
    const playerSession = player;
    readiness = "ready";
    const generate = async (seed: string) => {
      if (!session || stopped) return;
      const request=++worldRequest;
      shell.generateButton.disabled = true;
      shell.exploreButton.disabled = true;
      shell.seedInput.disabled = true;
      status("LOADING", "Generating your dungeon…");
      readiness = "initializing";
      shell.overlay.setAttribute("aria-busy", "true");
      pauseCoordinator.loading();
      try {
        const generated=await playerSession.load(seed);
        if (stopped||request!==worldRequest) return;
        targetView?.dispose(); targetView=null;
        setCombatWorld(generated.plan,[]);
        readiness = "ready";
        status("DUNGEON PREVIEW", `Floor 1 · Seed ${session.snapshot().campaignSeed}`);
        pauseCoordinator.ready();
      } catch (error) {
        if (stopped||request!==worldRequest) return;
        readiness = "ready";
        status("GENERATION FAILED", error instanceof Error ? error.message : "The dungeon could not be generated. Check the seed and try again.");
        if (session?.snapshot().currentFloors) pauseCoordinator.ready();
        else pauseCoordinator.unavailable();
      } finally {
        if (!stopped&&request===worldRequest) {
          shell.generateButton.disabled = false;
          shell.seedInput.disabled = false;
          shell.overlay.removeAttribute("aria-busy");
        }
      }
    };
    form = shell.overlay.querySelector<HTMLFormElement>("form");
    formSubmitListener = (event) => {
      event.preventDefault(); void generate(shell.seedInput.value);
    };
    form?.addEventListener("submit", formSubmitListener);
    shell.exploreButton.addEventListener("click", onExplore);
    if(import.meta.env.DEV) {
      const toolbar=document.createElement("aside"); toolbar.className="ck-training-controls"; toolbar.setAttribute("aria-label","Development training controls"); trainingToolbar=toolbar;
      const label=document.createElement("strong"); label.textContent="DEV TRAINING"; toolbar.append(label);
      for(const [text,variant] of [["Clear room","clear"],["Wall blocked","obstructed"]] as const) {const button=document.createElement("button");button.type="button";button.textContent=text;button.dataset.trainingVariant=variant;const onClick=()=>{void showTraining(variant);};button.addEventListener("click",onClick);trainingButtonCleanups.push(()=>button.removeEventListener("click",onClick));trainingButtons.push(button);toolbar.append(button);}
      appRoot.append(toolbar);
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    status("LOADING", "Preparing the dungeon preview…");
    player.input; // Keep the player session alive across floor rerolls.
    raf = requestAnimationFrame(frame);
    void generate(shell.seedInput.value);
  } catch {
    readiness = "unsupported";
    const ownedSession = session; session = null;
    const ownedPlayer = player; player = null;
    cleanup(() => ownedPlayer?.dispose());
    cleanup(() => ownedSession?.dispose());
    const ownedWorld = world; world = null;
    cleanup(() => ownedWorld?.dispose());
    cleanup(() => shell.exploreButton.removeEventListener("click", onExplore));
    status("RENDERING UNAVAILABLE", "CryptKeep could not initialize WebGL 2. Try a current desktop browser with hardware acceleration enabled.");
    shell.overlay.classList.add("cryptkeep__overlay--unsupported");
  }
}

function onExplore(): void {
  if (!player || stopped || readiness !== "ready" || document.hidden) return;
  pauseCoordinator.resumeRequested();
  player.requestFromGesture();
}

function onResume(): void {
  if (!player || stopped || readiness !== "ready" || document.hidden) return;
  pauseCoordinator.resumeRequested();
  player.requestFromGesture();
}
