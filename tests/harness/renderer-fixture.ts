import { createWorldRenderer, type WorldRenderer, type RendererResourceCounts } from "../../src/render/renderer";

interface NativeSession {
  canvas: HTMLCanvasElement;
  context: WebGL2RenderingContext;
  textureHandles: WebGLTexture[];
  renderer: WorldRenderer;
}

declare global {
  interface Window {
    rendererFixture: {
      create: () => WorldRenderer;
      observerCount: () => number;
      nativeStats: () => { lost: boolean; createdTextures: number; validTextures: number; contextsCreated: number; liveContexts: number; textureHandlesCreated: number; validTextureHandles: number };
      disposeActive: () => { lost: boolean; createdTextures: number; validTextures: number; contextsCreated: number; liveContexts: number; textureHandlesCreated: number; validTextureHandles: number; observers: number; canvases: number };
      removeDisposedCanvas: () => void;
      active: WorldRenderer | null;
      lastCounts: RendererResourceCounts | null;
    };
  }
}

let activeObservers = 0;
const NativeResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends NativeResizeObserver {
  private active = true;
  constructor(callback: ResizeObserverCallback) {
    super(callback);
    activeObservers += 1;
  }
  override disconnect(): void {
    if (this.active) {
      this.active = false;
      activeObservers -= 1;
    }
    super.disconnect();
  }
};

const root = document.querySelector<HTMLElement>("#fixture");
if (!root) throw new Error("Renderer fixture markup is incomplete.");
let activeSession: NativeSession | null = null;
const allSessions: NativeSession[] = [];

function newSession(): NativeSession {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Isolated renderer fixture");
  root.append(canvas);
  const context = canvas.getContext("webgl2");
  if (!context) throw new Error("This browser does not provide WebGL 2.");
  // Instrument this fixture context only; retain native handles to prove context retirement.
  const textureHandles: WebGLTexture[] = [];
  const createTexture = context.createTexture.bind(context);
  context.createTexture = () => {
    const texture = createTexture();
    if (texture) textureHandles.push(texture);
    return texture;
  };
  const renderer = createWorldRenderer(canvas, { context, resizeTarget: root });
  const session = { canvas, context, textureHandles, renderer };
  allSessions.push(session);
  return session;
}

function stats(session: NativeSession) {
  return {
    lost: session.context.isContextLost(),
    createdTextures: session.textureHandles.length,
    validTextures: session.textureHandles.filter((texture) => session.context.isTexture(texture)).length,
  };
}

function aggregateStats() {
  return {
    contextsCreated: allSessions.length,
    liveContexts: allSessions.filter((session) => !session.context.isContextLost()).length,
    textureHandlesCreated: allSessions.reduce((total, session) => total + session.textureHandles.length, 0),
    validTextureHandles: allSessions.reduce((total, session) => total + session.textureHandles.filter((texture) => session.context.isTexture(texture)).length, 0),
  };
}

window.rendererFixture = {
  lastCounts: null,
  active: null,
  nativeStats() {
    if (!activeSession) throw new Error("No active renderer context.");
    return { ...stats(activeSession), ...aggregateStats() };
  },
  disposeActive() {
    if (!activeSession) throw new Error("No active renderer to dispose.");
    const session = activeSession;
    session.renderer.dispose();
    session.renderer.dispose();
    const native = stats(session);
    const aggregate = aggregateStats();
    window.rendererFixture.lastCounts = session.renderer.getResourceCounts();
    window.rendererFixture.active = null;
    activeSession = null;
    return { ...native, ...aggregate, observers: activeObservers, canvases: root.querySelectorAll("canvas").length };
  },
  removeDisposedCanvas() {
    if (activeSession) throw new Error("Dispose the renderer before removing its canvas.");
    root.replaceChildren();
  },
  create() {
    if (activeSession) throw new Error("Retire the current renderer before creating its replacement.");
    activeSession = newSession();
    window.rendererFixture.active = activeSession.renderer;
    window.rendererFixture.lastCounts = activeSession.renderer.getResourceCounts();
    return activeSession.renderer;
  },
  observerCount: () => activeObservers,
};

window.rendererFixture.create();
document.querySelector("#counts")!.textContent = `GPU resources: ${JSON.stringify(window.rendererFixture.lastCounts)}`;
