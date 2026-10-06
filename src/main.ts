import { createAppShell } from "./app/shell";
import { createWorldRenderer } from "./render/renderer";
import { installDiagnostics, type AppReadiness } from "./debug";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("CryptKeep application root is missing.");
}

const shell = createAppShell(root);
let readiness: AppReadiness = shell.context ? "initializing" : "unsupported";
let world: ReturnType<typeof createWorldRenderer> | null = null;
const diagnostics = import.meta.env.DEV
  ? installDiagnostics(() => readiness, () => world?.getResourceCounts() ?? null)
  : null;
window.addEventListener("pagehide", () => {
  world?.dispose();
  diagnostics?.dispose();
}, { once: true });
if (shell.context) {
  try {
    world = createWorldRenderer(shell.canvas, { context: shell.context, resizeTarget: root });
    readiness = "ready";
    const statusLabel = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-label");
    const statusMessage = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-message");
    if (statusLabel) statusLabel.textContent = "DUNGEON PREVIEW";
    if (statusMessage) statusMessage.textContent = "A glimpse of the depths below.";
  } catch {
    readiness = "unsupported";
    world?.dispose();
    world = null;
    const statusLabel = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-label");
    const statusMessage = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-message");
    if (statusLabel) statusLabel.textContent = "RENDERING UNAVAILABLE";
    if (statusMessage) statusMessage.textContent = "CryptKeep could not initialize WebGL 2. Try a current desktop browser with hardware acceleration enabled.";
    shell.overlay.classList.add("cryptkeep__overlay--unsupported");
  }
}
