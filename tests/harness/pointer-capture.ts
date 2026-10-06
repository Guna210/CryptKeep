import { createPointerCapture, type PointerCaptureReason, type PointerCaptureState } from "../../src/app/pointer-capture";
import { InputSampler } from "../../src/core/input";

declare global {
  interface Window {
    pointerCaptureProof: {
      request(): void;
      sample(): ReturnType<InputSampler["sample"]>;
      state(): PointerCaptureState;
      dispose(): void;
      failNextRequest(): void;
    };
  }
}

const surface = document.querySelector<HTMLElement>("#surface")!;
const captureButton = document.querySelector<HTMLButtonElement>("#capture")!;
const deniedButton = document.querySelector<HTMLButtonElement>("#denied")!;
const status = document.querySelector<HTMLOutputElement>("#status")!;
const input = new InputSampler();
let failNext = false;
const capture = createPointerCapture(surface, input, {
  onStateChange(state: PointerCaptureState, reason?: PointerCaptureReason) {
    status.value = reason ? `Pointer capture ${state}: ${reason}` : `Pointer capture ${state}`;
  },
});

captureButton.addEventListener("click", () => capture.requestFromGesture());
deniedButton.addEventListener("click", () => {
  failNext = true;
  const original = surface.requestPointerLock;
  surface.requestPointerLock = function () {
    surface.requestPointerLock = original;
    if (failNext) {
      failNext = false;
      return Promise.reject(new DOMException("Capture denied by test fixture", "NotAllowedError"));
    }
    return original.call(surface);
  };
  capture.requestFromGesture();
});

window.pointerCaptureProof = {
  request: () => capture.requestFromGesture(),
  sample: () => input.sample(),
  state: () => capture.state,
  dispose: () => capture.dispose(),
  failNextRequest: () => { failNext = true; },
};
