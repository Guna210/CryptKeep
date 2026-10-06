import "../ui/shell.css";

export interface AppShell {
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLElement;
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
  status.className = "cryptkeep__status";

  const statusLabel = document.createElement("span");
  statusLabel.className = "cryptkeep__status-label";
  statusLabel.textContent = "INITIALIZING";

  const statusMessage = document.createElement("span");
  statusMessage.className = "cryptkeep__status-message";
  statusMessage.textContent = "Preparing the dungeon…";
  status.append(statusLabel, statusMessage);
  brand.append(status);
  overlay.append(brand);
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
    context,
    dispose() {
      root.replaceChildren();
    },
  };
}
