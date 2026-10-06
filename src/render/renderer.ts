import {
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from "three";

export interface RendererResourceCounts {
  geometries: number;
  textures: number;
  programs: number;
  drawCalls: number;
}

export interface WorldRenderer {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  getResourceCounts(): RendererResourceCounts;
  dispose(): void;
}

export interface WorldRendererOptions {
  /**
   * The renderer exclusively owns this context until dispose(). Disposing retires it;
   * create a fresh canvas and WebGL2 context before constructing another renderer.
   */
  context: WebGL2RenderingContext;
  /** Resize observation is scoped to the shell, not a process-wide window listener. */
  resizeTarget: HTMLElement;
  fov?: number;
  /** Keep the original diagnostic preview unless a floor-only scene is requested. */
  includeDiagnosticFixture?: boolean;
}

const LOGICAL_WIDTH = 480;
const LOGICAL_HEIGHT = 270;

function createDiagnosticFixture(scene: Scene): { root: Group; geometries: Set<BoxGeometry | ConeGeometry | PlaneGeometry>; materials: Set<MeshStandardMaterial> } {
  const root = new Group();
  const geometries = new Set<BoxGeometry | ConeGeometry | PlaneGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  const material = (color: number, roughness = 1) => {
    const value = new MeshStandardMaterial({ color, roughness, metalness: 0 });
    materials.add(value);
    return value;
  };
  const mesh = <T extends BoxGeometry | ConeGeometry | PlaneGeometry>(geometry: T, color: number, x: number, y: number, z: number, scale = 1) => {
    geometries.add(geometry);
    const object = new Mesh(geometry, material(color));
    object.position.set(x, y, z);
    object.scale.setScalar(scale);
    root.add(object);
  };

  mesh(new PlaneGeometry(18, 18), 0x3b403a, 0, -0.08, -2);
  mesh(new BoxGeometry(1.3, 1.3, 1.3), 0x966144, -2.2, 0.58, 0);
  mesh(new BoxGeometry(1.15, 2.6, 1.15), 0x626d73, 2.1, 1.22, -1.2);
  mesh(new ConeGeometry(0.78, 1.8, 5), 0x9d553f, 0, 0.88, -2.5);
  mesh(new BoxGeometry(0.45, 2.2, 0.45), 0x887b60, -4.4, 1.02, -3.6);
  mesh(new BoxGeometry(0.45, 2.2, 0.45), 0x887b60, 4.4, 1.02, -3.6);

  const ground = root.children[0];
  if (ground) ground.rotation.x = -Math.PI / 2;
  scene.add(root);
  return { root, geometries, materials };
}

/** Creates a low-resolution Three.js world renderer on the shell's existing canvas/context. */
export function createWorldRenderer(canvas: HTMLCanvasElement, options: WorldRendererOptions): WorldRenderer {
  const { context, resizeTarget } = options;
  const renderer = new WebGLRenderer({ canvas, context, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setClearColor(new Color(0x11151a), 1);
  renderer.outputColorSpace = "srgb";
  renderer.info.autoReset = true;

  const scene = new Scene();
  scene.background = new Color(0x11151a);
  const camera = new PerspectiveCamera(options.fov ?? 70, 16 / 9, 0.1, 100);
  camera.position.set(0, 3.1, 9.5);
  camera.lookAt(0, 0.6, -1.1);
  scene.add(new DirectionalLight(0xffd39b, 2.2));
  const fill = new DirectionalLight(0x7e91b8, 0.8);
  fill.position.set(-3, 4, 5);
  scene.add(fill);
  const fixture = options.includeDiagnosticFixture === false ? null : createDiagnosticFixture(scene);

  let disposed = false;
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, resizeTarget.clientWidth);
    const height = Math.max(1, resizeTarget.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Keep a low-resolution buffer while following the viewport's shape.
    const scale = Math.min(LOGICAL_WIDTH / width, LOGICAL_HEIGHT / height);
    const bufferWidth = Math.max(1, Math.round(width * scale));
    const bufferHeight = Math.max(1, Math.round(height * scale));
    renderer.setSize(bufferWidth, bufferHeight, false);
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(resizeTarget);
  resize();

  return {
    scene,
    camera,
    renderer,
    getResourceCounts() {
      return {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        drawCalls: renderer.info.render.calls,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      if (fixture) {
        scene.remove(fixture.root);
        for (const geometry of fixture.geometries) geometry.dispose();
        for (const material of fixture.materials) material.dispose();
      }
      scene.clear();
      renderer.dispose();
      // Three.js keeps some internal GPU textures outside renderer-local ownership.
      // Retiring the exclusively owned context releases every native handle at once.
      renderer.forceContextLoss();
    },
  };
}
