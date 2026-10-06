import type { RendererResourceCounts } from "../render/renderer";

export type AppReadiness = "initializing" | "ready" | "unsupported";

export interface DiagnosticSnapshot {
  readiness: AppReadiness;
  renderer: Readonly<RendererResourceCounts> | null;
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
): { dispose(): void } {
  const api = Object.freeze({
    snapshot(): Readonly<DiagnosticSnapshot> {
      const counts = getRendererCounts();
      const renderer = counts ? Object.freeze({ ...counts }) : null;
      return Object.freeze({ readiness: getReadiness(), renderer });
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
