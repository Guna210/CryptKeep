import { spawn as nodeSpawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const verificationStages = [
  { name: "typecheck", command: "npm", args: ["run", "typecheck"] },
  { name: "unit", command: "npm", args: ["test"] },
  { name: "build", command: "npm", args: ["run", "build"] },
  { name: "browser", command: "npm", args: ["run", "test:e2e"] },
];

/** Runs commands in order, stopping on the first error, nonzero exit, or signal. */
export async function runStages(stages, { cwd = root, spawn = nodeSpawn, output = console.log } = {}) {
  for (const stage of stages) {
    output(`[verify] ${stage.name}: ${stage.command} ${stage.args.join(" ")}`);
    const result = await new Promise((resolve) => {
      let child;
      try {
        child = spawn(stage.command, stage.args, { cwd, stdio: "inherit", shell: false });
      } catch (error) {
        resolve({ error });
        return;
      }
      child.once("error", (error) => resolve({ error }));
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    if (result.error) {
      output(`[verify] ${stage.name} failed to start: ${result.error.message}`);
      return 1;
    }
    if (result.signal) {
      output(`[verify] ${stage.name} terminated by signal ${result.signal}`);
      return 1;
    }
    if (result.code !== 0) {
      output(`[verify] ${stage.name} failed with exit code ${result.code}`);
      return result.code || 1;
    }
    output(`[verify] ${stage.name}: passed`);
  }
  output("[verify] all stages passed");
  return 0;
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  process.exitCode = await runStages(verificationStages);
}
