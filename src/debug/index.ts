import type { RendererResourceCounts } from "../render/renderer";
import type { FloorSessionSnapshot } from "../app/floor-session";

export type AppReadiness = "initializing" | "ready" | "unsupported";

export interface DiagnosticSnapshot {
  readiness: AppReadiness;
  renderer: Readonly<RendererResourceCounts> | null;
  floor: Readonly<FloorSessionSnapshot> | null;
}

declare global {
  interface Window {
    /** Development-only read boundary for detached app/render snapshots. */
    __cryptkeepDiagnostics?: Readonly<{ snapshot(): Readonly<DiagnosticSnapshot> }>;
  }
}

/** Installs the documented, read-only development diagnostics boundary. */
export function installDiagnostics(
  getReadiness: () => AppReadiness,
  getRendererCounts: () => RendererResourceCounts | null,
  getFloorSnapshot: () => Readonly<FloorSessionSnapshot> | null = () => null,
): { dispose(): void } {
  const api = Object.freeze({
    snapshot(): Readonly<DiagnosticSnapshot> {
      const counts = getRendererCounts();
      const renderer = counts ? Object.freeze({ ...counts }) : null;
      return Object.freeze({ readiness: getReadiness(), renderer, floor: getFloorSnapshot() });
    },
  });
  Object.defineProperty(window, "__cryptkeepDiagnostics", {
    configurable: true,
    enumerable: false,
    value: api,
    writable: false,
  });

  return {
    dispose() {
      if (window.__cryptkeepDiagnostics === api) delete window.__cryptkeepDiagnostics;
    },
  };
}
