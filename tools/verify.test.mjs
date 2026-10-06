import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runStages } from "./verify.mjs";

const record = (file, value, exit = 0) => ({
  name: value,
  command: process.execPath,
  args: ["-e", `require('node:fs').appendFileSync(${JSON.stringify(file)}, ${JSON.stringify(`${value}\n`)}); process.exit(${exit})`],
});

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "cryptkeep-verify-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, log: path.join(dir, "stages.log") };
}

test("runs every successful stage in order", async (t) => {
  const { dir, log } = await fixture(t);
  const status = [];
  const result = await runStages([record(log, "typecheck"), record(log, "unit"), record(log, "build"), record(log, "browser")], {
    cwd: dir,
    output: (line) => status.push(line),
  });
  assert.equal(result, 0);
  assert.equal(await readFile(log, "utf8"), "typecheck\nunit\nbuild\nbrowser\n");
  assert.deepEqual(status.filter((line) => line.endsWith(": passed")), [
    "[verify] typecheck: passed", "[verify] unit: passed", "[verify] build: passed", "[verify] browser: passed",
  ]);
});

for (const failedStage of ["typecheck", "unit", "build", "browser"]) {
  test(`stops with failure when ${failedStage} exits nonzero`, async (t) => {
    const { dir, log } = await fixture(t);
    const names = ["typecheck", "unit", "build", "browser"];
    const stages = names.map((name) => record(log, name, name === failedStage ? 7 : 0));
    assert.equal(await runStages(stages, { cwd: dir, output: () => {} }), 7);
    assert.equal(await readFile(log, "utf8"), `${names.slice(0, names.indexOf(failedStage) + 1).join("\n")}\n`);
  });
}

test("reports an executable error and does not start later stages", async (t) => {
  const { dir, log } = await fixture(t);
  const result = await runStages([
    { name: "missing", command: path.join(dir, "absent-executable"), args: [] },
    record(log, "later"),
  ], { cwd: dir, output: () => {} });
  assert.notEqual(result, 0);
  await assert.rejects(readFile(log));
});

test("treats a signaled child as failure", async (t) => {
  const { dir } = await fixture(t);
  const result = await runStages([
    { name: "signal", command: process.execPath, args: ["-e", "process.kill(process.pid, 'SIGTERM')"] },
  ], { cwd: dir, output: () => {} });
  assert.notEqual(result, 0);
});
