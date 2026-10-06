import type { PauseSnapshot } from "../app/pause";

export interface MinimalPauseUI {
  readonly element: HTMLElement;
  readonly resumeButton: HTMLButtonElement;
  render(snapshot: PauseSnapshot): void;
  dispose(): void;
}

/** Small accessible pause/resume surface with an explicitly owned click listener. */
export function createMinimalPauseUI(parent: HTMLElement, onResume: () => void): MinimalPauseUI {
  const element = document.createElement("section");
  element.className = "cryptkeep__pause";
  element.setAttribute("aria-labelledby", "cryptkeep-pause-title");
  const title = document.createElement("h2");
  title.id = "cryptkeep-pause-title";
  title.textContent = "Game paused";
  const message = document.createElement("p");
  message.className = "cryptkeep__pause-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  const help = document.createElement("p");
  help.textContent = "WASD move · Left Shift sprint · Space dash · Mouse look · Escape pauses";
  const resumeButton = document.createElement("button");
  resumeButton.type = "button";
  resumeButton.className = "cryptkeep__resume";
  resumeButton.textContent = "Resume";
  resumeButton.setAttribute("aria-label", "Resume dungeon");
  resumeButton.addEventListener("click", onResume);
  element.append(title, message, help, resumeButton);
  parent.append(element);
  return {
    element, resumeButton,
    render(snapshot) {
      const visible = snapshot.phase === "paused" || snapshot.phase === "requesting" || snapshot.phase === "waiting";
      element.hidden = !visible;
      element.dataset.phase = snapshot.phase;
      message.textContent = snapshot.reason;
      resumeButton.disabled = snapshot.phase === "requesting" || snapshot.phase === "waiting";
    },
    dispose() { resumeButton.removeEventListener("click", onResume); element.remove(); },
  };
}
