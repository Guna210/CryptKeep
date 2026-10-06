import { describe, expect, it } from "vitest";
import { PauseCoordinator } from "./pause";

describe("PauseCoordinator", () => {
  it("requires capture after readiness and resumes only after native capture succeeds", () => {
    const changes: string[] = [];
    const pause = new PauseCoordinator(false, (state) => changes.push(state.phase));
    expect(pause.snapshot().phase).toBe("loading");
    pause.ready();
    expect(pause.snapshot().phase).toBe("available");
    pause.resumeRequested();
    expect(pause.snapshot().phase).toBe("requesting");
    pause.captureChanged("captured");
    expect(pause.snapshot().phase).toBe("playing");
    pause.captureChanged("idle", "blur");
    expect(pause.snapshot()).toMatchObject({ phase:"paused", reason:"Paused because the window lost focus." });
    pause.resumeRequested();
    pause.captureChanged("failed", "denied");
    expect(pause.snapshot()).toMatchObject({ phase:"paused", reason:"Mouse capture was denied. Choose Resume to try again." });
    const count = changes.length;
    pause.dispose();
    pause.captureChanged("captured");
    expect(pause.snapshot().phase).toBe("disposed");
    expect(changes.length).toBe(count + 1);
  });

  it("does not make a loading, unsupported, or disposed session resumable", () => {
    const unsupported = new PauseCoordinator(true);
    unsupported.ready();
    unsupported.resumeRequested();
    unsupported.captureChanged("captured");
    expect(unsupported.snapshot().phase).toBe("unsupported");
    const loading = new PauseCoordinator();
    loading.loading();
    loading.captureChanged("captured");
    expect(loading.snapshot().phase).toBe("loading");
    const failed = new PauseCoordinator();
    failed.unavailable();
    failed.resumeRequested();
    failed.captureChanged("captured");
    expect(failed.snapshot().phase).toBe("unavailable");
    failed.loading();
    failed.ready();
    expect(failed.snapshot().phase).toBe("available");
  });
});
