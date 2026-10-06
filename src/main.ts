import "./ui/shell.css";
import { createAppShell } from "./app/shell";
import { FloorSession } from "./app/floor-session";
import { PlayerSession } from "./app/player-session";
import { createRenderedFloor } from "./render/floor";
import { createMaterialLibrary } from "./render/materials";
import { createWorldRenderer } from "./render/renderer";
import { installDiagnostics, type AppReadiness } from "./debug";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("CryptKeep application root is missing.");
const shell = createAppShell(root);
let readiness: AppReadiness = shell.context ? "initializing" : "unsupported";
let world: ReturnType<typeof createWorldRenderer> | null = null;
let session: FloorSession | null = null;
let player: PlayerSession | null = null;
let raf = 0;
let stopped = false;
let form: HTMLFormElement | null = null;
let formSubmitListener: ((event: SubmitEvent) => void) | null = null;
const diagnostics = import.meta.env.DEV
  ? installDiagnostics(() => readiness, () => world?.getResourceCounts() ?? null, () => session?.snapshot() ?? null, () => player?.snapshot() ?? null)
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
  player?.advance(timestamp);
  if (world && !document.hidden) world.renderer.render(world.scene, world.camera);
  raf = requestAnimationFrame(frame);
}
function pause(reason: "blur" | "hidden" | "pause"): void { player?.release(reason); }
function resume(_reason: string): void { /* Focus never resumes gameplay without a fresh gesture. */ }
function teardown(): void {
  if (stopped) return;
  stopped = true;
  cleanup(() => cancelAnimationFrame(raf));
  const ownedPlayer = player; player = null;
  cleanup(() => ownedPlayer?.dispose());
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
  cleanup(() => window.removeEventListener("focus", onFocus));
  cleanup(() => window.removeEventListener("pagehide", teardown));
  cleanup(() => shell.dispose());
}
function onVisibility(): void { document.hidden ? pause("hidden") : resume("visible"); }
function onBlur(): void { pause("blur"); }
function onFocus(): void { resume("focus"); }

window.addEventListener("pagehide", teardown);

if (shell.context) {
  try {
    world = createWorldRenderer(shell.canvas, { context: shell.context, resizeTarget: root, includeDiagnosticFixture: false });
    session = new FloorSession(world, { createFloor:(generated, library) => createRenderedFloor(generated.plan, library, { ceilingVisible:true }) });
    player = new PlayerSession(session, world, shell.canvas, (state) => {
      shell.exploreButton.textContent = state === "captured" ? "Mouse captured · Escape to release" : "Explore dungeon";
      if (state === "captured") shell.overlay.classList.add("cryptkeep__overlay--playing");
      else shell.overlay.classList.remove("cryptkeep__overlay--playing");
      if (state === "captured") player?.resumeAfterCapture(performance.now());
    });
    const playerSession = player;
    readiness = "ready";
    const generate = async (seed: string) => {
      if (!session || stopped) return;
      shell.generateButton.disabled = true;
      shell.exploreButton.disabled = true;
      shell.seedInput.disabled = true;
      status("LOADING", "Generating your dungeon…");
      readiness = "initializing";
      shell.overlay.setAttribute("aria-busy", "true");
      try {
        await playerSession.load(seed);
        if (stopped) return;
        readiness = "ready";
        status("DUNGEON PREVIEW", `Floor 1 · Seed ${session.snapshot().campaignSeed}`);
      } catch (error) {
        if (stopped) return;
        readiness = "ready";
        status("GENERATION FAILED", error instanceof Error ? error.message : "The dungeon could not be generated. Check the seed and try again.");
      } finally {
        if (!stopped) {
          shell.generateButton.disabled = false;
          shell.exploreButton.disabled = false;
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
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
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
  if (!player) return;
  if (player.capture.state === "captured") { player.release("pause"); return; }
  player.requestFromGesture();
}
