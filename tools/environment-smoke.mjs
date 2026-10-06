import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(repoDir, ".cache", "cryptkeep");
await mkdir(cacheDir, { recursive: true });
const fixtureDir = await mkdtemp(path.join(cacheDir, "environment-smoke-"));
const binDir = path.join(repoDir, "node_modules", ".bin");
const checks = [];
let server;
let browser;

function report(label, detail) {
  checks.push(label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoDir,
    encoding: "utf8",
    env: process.env,
    ...options,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `${command} ${args.join(" ")} exited ${result.status}`);
  return result;
}

try {
  await mkdir(path.join(fixtureDir, "src"), { recursive: true });
  await writeFile(
    path.join(fixtureDir, "package.json"),
    JSON.stringify({ name: "cryptkeep-environment-fixture", private: true, type: "module" }, null, 2),
  );
  await writeFile(
    path.join(fixtureDir, "tsconfig.json"),
    JSON.stringify({
      extends: path.join(repoDir, "tsconfig.json"),
      compilerOptions: { noEmit: true },
      include: ["src/**/*.ts"],
      exclude: [],
    }, null, 2),
  );
  await writeFile(
    path.join(fixtureDir, "src", "geometry.ts"),
    `import * as THREE from "three";\n\nexport function fixtureLength(): number {\n  return new THREE.Vector3(3, 4, 0).length();\n}\n`,
  );
  await writeFile(
    path.join(fixtureDir, "src", "geometry.test.ts"),
    `import { describe, expect, it } from "vitest";\nimport { fixtureLength } from "./geometry.js";\n\ndescribe("installed Three.js toolchain", () => {\n  it("loads Three.js types and computes a vector length", () => {\n    expect(fixtureLength()).toBe(5);\n  });\n  it("keeps the result finite for renderer setup", () => {\n    expect(Number.isFinite(fixtureLength())).toBe(true);\n  });\n});\n`,
  );
  await writeFile(
    path.join(fixtureDir, "index.html"),
    `<!doctype html>\n<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CryptKeep environment fixture</title></head><body><main id="result">Starting renderer check…</main><script type="module" src="/src/main.ts"></script></body></html>\n`,
  );
  await writeFile(
    path.join(fixtureDir, "src", "main.ts"),
    `import * as THREE from "three";\n\nconst result = document.querySelector<HTMLElement>("#result");\nif (!result) throw new Error("Fixture result element is missing");\ntry {\n  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });\n  renderer.setSize(64, 64, false);\n  renderer.setClearColor(0x102030, 1);\n  const scene = new THREE.Scene();\n  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);\n  camera.position.z = 2;\n  const geometry = new THREE.BufferGeometry();\n  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-0.8, -0.8, 0, 0.8, -0.8, 0, 0, 0.8, 0], 3));\n  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide })));\n  document.body.append(renderer.domElement);\n  renderer.render(scene, camera);\n  const gl = renderer.getContext();\n  const pixels = new Uint8Array(64 * 64 * 4);\n  gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);\n  let magentaPixels = 0;\n  for (let index = 0; index < pixels.length; index += 4) {\n    const red = pixels[index] ?? 0;\n    const green = pixels[index + 1] ?? 0;\n    const blue = pixels[index + 2] ?? 0;\n    if (red > 100 && green < 100 && blue > 100) magentaPixels += 1;\n  }\n  if (magentaPixels < 50) throw new Error(\`Expected rendered triangle pixels, read \${magentaPixels}\`);\n  result.dataset.status = "pass";\n  result.textContent = \`Three.js WebGL pixel readback passed: \${magentaPixels} colored pixels\`;\n  renderer.dispose();\n} catch (error) {\n  result.dataset.status = "fail";\n  result.textContent = String(error);\n  throw error;\n}\n`,
  );
  await writeFile(
    path.join(fixtureDir, "vite.config.ts"),
    `import { defineConfig } from "vite";\nexport default defineConfig({\n  root: ${JSON.stringify(fixtureDir)},\n  configFile: false,\n  logLevel: "error",\n  build: { outDir: ${JSON.stringify(path.join(fixtureDir, "dist"))}, emptyOutDir: true },\n  server: { host: "127.0.0.1", port: 0, strictPort: false },\n});\n`,
  );
  await writeFile(
    path.join(fixtureDir, "vitest.config.ts"),
    `import { defineConfig } from "vitest/config";\nexport default defineConfig({\n  root: ${JSON.stringify(fixtureDir)},\n  test: { include: ["src/**/*.test.ts"], environment: "node" },\n});\n`,
  );

  run(path.join(binDir, "tsc"), ["--noEmit", "--project", path.join(fixtureDir, "tsconfig.json")]);
  report("TypeScript compiles a generated fixture importing Three.js types");

  const testReport = path.join(fixtureDir, "vitest-report.json");
  run(process.execPath, [
    path.join(repoDir, "node_modules", "vitest", "vitest.mjs"),
    "run",
    "--config",
    path.join(fixtureDir, "vitest.config.ts"),
    "--maxWorkers",
    "2",
    "--reporter=json",
    "--outputFile",
    testReport,
  ]);
  const testResults = JSON.parse(await readFile(testReport, "utf8"));
  assert.equal(testResults.numPassedTests, 2, "expected both generated Vitest fixture tests to pass");
  assert.equal(testResults.numFailedTests, 0, "generated Vitest fixture has failed tests");
  report("Vitest executes generated toolchain fixture", `${testResults.numPassedTests} passed, ${testResults.numFailedTests} failed`);

  const { build, createServer } = await import("vite");
  await build({ configFile: path.join(fixtureDir, "vite.config.ts"), mode: "production" });
  const builtHtml = await readFile(path.join(fixtureDir, "dist", "index.html"), "utf8");
  assert.match(builtHtml, /assets\/.+\.js/, "Vite production output does not reference a bundled JavaScript asset");
  report("Vite creates a production bundle", "generated HTML and JavaScript asset found");

  server = await createServer({
    configFile: path.join(fixtureDir, "vite.config.ts"),
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address === "object", "Vite did not expose an HTTP server address");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200, "Vite development server did not serve the fixture page");
  assert.match(await response.text(), /CryptKeep environment fixture/);
  report("Vite development server serves the generated page", `HTTP ${response.status}`);

  const { chromium } = await import("playwright-core");
  const browserConfig = JSON.parse(await readFile(path.join(repoDir, "tools", "cloud-browser.json"), "utf8"));
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: browserConfig.args,
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#result[data-status]").waitFor({ timeout: 15_000 });
  const renderMessage = await page.locator("#result").innerText();
  const renderStatus = await page.locator("#result").getAttribute("data-status");
  assert.equal(renderStatus, "pass", `Three.js browser fixture failed: ${renderMessage}`);
  assert.deepEqual(pageErrors, [], `browser page errors: ${pageErrors.join("; ")}`);
  assert.match(renderMessage, /pixel readback passed: [1-9][0-9]* colored pixels/);
  report("Playwright Chromium renders Three.js through WebGL", renderMessage);

  console.log(`Environment checks passed: ${checks.length}`);
  console.log("Scope: toolchain fixtures only; no game code or gameplay behavior was tested.");
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixtureDir, { recursive: true, force: true });
}
