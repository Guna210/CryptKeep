import "../ui/shell.css";

export interface AppShell {
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLElement;
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
  const gl = getContext(canvas);
  if (gl) {
    gl.clearColor(0.035, 0.045, 0.065, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  } else {
    statusLabel.textContent = "RENDERING UNAVAILABLE";
    statusMessage.textContent = "CryptKeep needs WebGL 2 to render. Try a current desktop browser with hardware acceleration enabled.";
    overlay.classList.add("cryptkeep__overlay--unsupported");
  }

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(root.clientWidth * ratio));
    const height = Math.max(1, Math.floor(root.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      if (gl) {
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
  };
  window.addEventListener("resize", resize);
  resize();

  return {
    canvas,
    overlay,
    dispose() {
      window.removeEventListener("resize", resize);
      root.replaceChildren();
    },
  };
}
