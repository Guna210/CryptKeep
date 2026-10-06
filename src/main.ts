import { createAppShell } from "./app/shell";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("CryptKeep application root is missing.");
}

createAppShell(root);
