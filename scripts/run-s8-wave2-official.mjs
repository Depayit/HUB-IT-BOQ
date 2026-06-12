/**
 * Sprint 8 Wave 2 — full official execution (E0 + NP-003..007)
 *
 * Usage: node scripts/run-s8-wave2-official.mjs
 */
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const E0_ROOT = path.resolve("docs/SPRINT_8/WAVE2/evidence/E0-pre-run-baseline");

const SCENARIOS = ["NP-003", "NP-004", "NP-007", "NP-005", "NP-006"];

async function run(cmd, logFile) {
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
    });
    if (logFile) {
      await writeFile(logFile, out, "utf8");
    }
    return { exitCode: 0, output: out };
  } catch (err) {
    const output = (err.stdout ?? "") + (err.stderr ?? "");
    if (logFile) {
      await writeFile(logFile, output, "utf8");
    }
    return { exitCode: err.status ?? 1, output };
  }
}

async function runE0() {
  await mkdir(E0_ROOT, { recursive: true });
  console.log("\n=== E0: typecheck ===");
  const tc = await run("npm run typecheck", path.join(E0_ROOT, "typecheck.log"));
  if (tc.exitCode !== 0) {
    throw new Error("E0 STOP: typecheck failed");
  }
  console.log("typecheck PASS");

  console.log("\n=== E0: tests ===");
  const test = await run("npm test", path.join(E0_ROOT, "test-summary.log"));
  if (test.exitCode !== 0) {
    throw new Error("E0 STOP: tests failed");
  }
  console.log("tests PASS");
  return { typecheck: "PASS", tests: "PASS" };
}

async function seedAndRun(npId) {
  console.log(`\n=== ${npId}: seed ===`);
  const seedOut = execSync(`node scripts/seed-s8-wave2-scenarios.mjs --scenario=${npId}`, {
    encoding: "utf8",
  });
  const seed = JSON.parse(seedOut);
  const logPath = path.join(E0_ROOT, `seed-${npId.toLowerCase()}.log`);
  await writeFile(logPath, seedOut, "utf8");
  console.log(`  project=${seed.projectId} boq=${seed.boqVersionId}`);

  console.log(`=== ${npId}: execute ===`);
  execSync(
    `npx tsx scripts/execute-s8-wave2-official.mjs --np=${npId.replace("NP-", "")} --project=${seed.projectId} --boq=${seed.boqVersionId}`,
    { stdio: "inherit" },
  );
  return { npId, ...seed, verdict: "see execution report" };
}

async function main() {
  const e0 = await runE0();
  const results = [];
  for (const npId of SCENARIOS) {
    results.push(await seedAndRun(npId));
  }
  console.log("\n=== Wave 2 complete ===");
  console.log(JSON.stringify({ e0, results }, null, 2));
}

main().catch((err) => {
  console.error("WAVE2 ORCHESTRATOR STOP:", err.message ?? err);
  process.exit(1);
});
