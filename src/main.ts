import { createAppShell } from "./app/shell";
import { createWorldRenderer } from "./render/renderer";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("CryptKeep application root is missing.");
}

const shell = createAppShell(root);
if (shell.context) {
  try {
    const world = createWorldRenderer(shell.canvas, { context: shell.context, resizeTarget: root });
    const statusLabel = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-label");
    const statusMessage = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-message");
    if (statusLabel) statusLabel.textContent = "DUNGEON PREVIEW";
    if (statusMessage) statusMessage.textContent = "A glimpse of the depths below.";
    window.addEventListener("pagehide", () => world.dispose(), { once: true });
  } catch {
    const statusLabel = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-label");
    const statusMessage = shell.overlay.querySelector<HTMLElement>(".cryptkeep__status-message");
    if (statusLabel) statusLabel.textContent = "RENDERING UNAVAILABLE";
    if (statusMessage) statusMessage.textContent = "CryptKeep could not initialize WebGL 2. Try a current desktop browser with hardware acceleration enabled.";
    shell.overlay.classList.add("cryptkeep__overlay--unsupported");
  }
}
