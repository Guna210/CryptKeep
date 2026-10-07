/** Tracks whether an inactive preview needs another WebGL draw. Simulation still advances every RAF. */
export function createRenderScheduler() {
  let dirty = true;
  let previousSignature = "";
  let previousViewport = "";
  return {
    invalidate(): void { dirty = true; },
    shouldRender(active: boolean, signature: string, viewport: string, visible: boolean): boolean {
      if (!visible) return false;
      if (active || dirty || signature !== previousSignature || viewport !== previousViewport) {
        dirty = false;
        previousSignature = signature;
        previousViewport = viewport;
        return true;
      }
      return false;
    },
  };
}
