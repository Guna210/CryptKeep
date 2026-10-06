import "../ui/shell.css";

export interface AppShell {
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLElement;
  readonly seedInput: HTMLInputElement;
  readonly generateButton: HTMLButtonElement;
  readonly statusLabel: HTMLElement;
  readonly statusMessage: HTMLElement;
  readonly legend: HTMLElement;
  readonly exploreButton: HTMLButtonElement;
  readonly context: WebGL2RenderingContext | null;
  dispose(): void;
}

export interface ShellOptions {
  /** Allows capability checks to be simulated in a browser test. */
  getWebGL2Context?: (canvas: HTMLCanvasElement) => WebGL2RenderingContext | null;
}

export function createAppShell(root: HTMLElement, options: ShellOptions = {}): AppShell {
  const canvas = document.createElement("canvas");
  canvas.className = "cryptkeep__canvas";
  canvas.setAttribute("aria-hidden", "true");

  const overlay = document.createElement("main");
  overlay.className = "cryptkeep__overlay";
  overlay.setAttribute("aria-label", "CryptKeep status");

  const brand = document.createElement("div");
  brand.className = "cryptkeep__brand";
  brand.innerHTML = '<span class="cryptkeep__rune" aria-hidden="true">✦</span><h1>CRYPTKEEP</h1>';

  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.className = "cryptkeep__status";

  const statusLabel = document.createElement("span");
  statusLabel.className = "cryptkeep__status-label";
  statusLabel.textContent = "INITIALIZING";

  const statusMessage = document.createElement("span");
  statusMessage.className = "cryptkeep__status-message";
  statusMessage.textContent = "Preparing the dungeon…";
  status.append(statusLabel, statusMessage);
  brand.append(status);
  const controls = document.createElement("form");
  controls.className = "cryptkeep__controls";
  const label = document.createElement("label");
  label.htmlFor = "cryptkeep-seed";
  label.textContent = "Dungeon seed";
  const seedInput = document.createElement("input");
  seedInput.id = "cryptkeep-seed";
  seedInput.name = "seed";
  seedInput.maxLength = 128;
  seedInput.autocomplete = "off";
  seedInput.value = "cryptkeep-preview";
  const generateButton = document.createElement("button");
  generateButton.type = "submit";
  generateButton.textContent = "Generate dungeon";
  controls.append(label, seedInput, generateButton);
  const legend = document.createElement("p");
  legend.className = "cryptkeep__legend";
  legend.innerHTML = '<span class="entry">Entry</span><span class="boss">Boss</span><span class="reward">Reward</span><span class="exit">Exit</span>';
  const panel = document.createElement("section");
  panel.className = "cryptkeep__panel";
  panel.append(brand, controls, legend, exploreButton, help);
  overlay.append(panel);
  root.replaceChildren(canvas, overlay);

  const getContext = options.getWebGL2Context ?? ((element) => element.getContext("webgl2"));
  const context = getContext(canvas);
  if (!context) {
    statusLabel.textContent = "RENDERING UNAVAILABLE";
    statusMessage.textContent = "CryptKeep needs WebGL 2 to render. Try a current desktop browser with hardware acceleration enabled.";
    overlay.classList.add("cryptkeep__overlay--unsupported");
  }

  return {
    canvas,
    overlay,
    seedInput,
    generateButton,
    statusLabel,
    statusMessage,
    legend,
    exploreButton,
    context,
    dispose() {
      root.replaceChildren();
    },
  };
}
  const exploreButton = document.createElement("button");
  exploreButton.type = "button";
  exploreButton.className = "cryptkeep__explore";
  exploreButton.textContent = "Explore dungeon";
  exploreButton.setAttribute("aria-describedby", "cryptkeep-help");
  const help = document.createElement("p");
  help.id = "cryptkeep-help";
  help.className = "cryptkeep__help";
  help.textContent = "WASD move · Left Shift sprint · Space dash · Mouse look · Escape release mouse";
