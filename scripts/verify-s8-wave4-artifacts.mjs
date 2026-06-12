/**
 * Sprint 8 Wave 4 — artifact verification
 *
 * Usage: node scripts/verify-s8-wave4-artifacts.mjs
 */
import { readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const WAVE4_ROOT = path.resolve("docs/SPRINT_8/WAVE4");
const REPORT_ROOT = path.join(WAVE4_ROOT, "EXECUTION_REPORT");

function evidenceDir(npId) {
  return path.join(WAVE4_ROOT, "evidence", npId);
}

const SCENARIOS = ["NP-010", "NP-011"];

const REQUIRED_SCRIPTS = [
  "scripts/seed-s8-wave4-scenarios.mjs",
  "scripts/run-s8-wave4-official.mjs",
  "scripts/execute-s8-wave4-official.mjs",
  "scripts/lib/s8-wave4-evidence.mjs",
  "scripts/verify-s8-wave4-artifacts.mjs",
];

const EVIDENCE_FILES = {
  E1: "E1-seed-payload.json",
  E2: "E2-validation-snapshot.json",
  E3: "E3-workflow-state.json",
  E4: "E4-approval-gates.json",
  E5: "E5-handoff-record.json",
  E6: "E6-readiness-status.json",
  E7: path.join("E7-export-result", "metadata.json"),
  E8: "E8-audit-trail.json",
  E9: "E9-execution-note.md",
};

const MIN_SCRIPT_BYTES = 1000;
const MIN_EVIDENCE_BYTES = 20;

const results = [];

function fail(check, detail) {
  results.push({ check, status: "FAIL", detail });
}

function pass(check, detail) {
  results.push({ check, status: "PASS", detail });
}

function fileSize(relPath) {
  const abs = path.resolve(relPath);
  if (!existsSync(abs)) return null;
  return statSync(abs).size;
}

function checkScripts() {
  for (const rel of REQUIRED_SCRIPTS) {
    const size = fileSize(rel);
    if (size == null) {
      fail(`Script exists: ${rel}`, "missing");
      continue;
    }
    if (size <= MIN_SCRIPT_BYTES) {
      fail(`Script size > ${MIN_SCRIPT_BYTES}: ${rel}`, `${size} bytes`);
    } else {
      pass(`Script size > ${MIN_SCRIPT_BYTES}: ${rel}`, `${size} bytes`);
    }
  }
}

function checkScenarioEvidence(npId) {
  const dir = evidenceDir(npId);
  for (const [label, relFile] of Object.entries(EVIDENCE_FILES)) {
    const abs = path.join(dir, relFile);
    if (!existsSync(abs)) {
      fail(`${npId} ${label}`, `missing ${relFile}`);
      continue;
    }
    const size = statSync(abs).size;
    if (size <= MIN_EVIDENCE_BYTES) {
      fail(`${npId} ${label} size > ${MIN_EVIDENCE_BYTES}`, `${size} bytes`);
    } else {
      pass(`${npId} ${label}`, `${size} bytes`);
    }
  }

  const e1Path = path.join(dir, EVIDENCE_FILES.E1);
  if (existsSync(e1Path)) {
    try {
      const e1 = JSON.parse(readFileSync(e1Path, "utf8"));
      const boqId = e1.boq_version_id ?? e1.boqVersion?.boq_version_id;
      if (e1.scenario !== npId) {
        fail(`${npId} E1 scenario field`, `expected ${npId}, got ${e1.scenario ?? "null"}`);
      } else {
        pass(`${npId} E1 scenario field`, npId);
      }
      if (!boqId) fail(`${npId} E1 boq_version_id`, "missing");
      else pass(`${npId} E1 boq_version_id present`, boqId);
    } catch (err) {
      fail(`${npId} E1 parse`, err instanceof Error ? err.message : String(err));
    }
  }

  const gimPath = path.join(dir, "governance-integrity-matrix.json");
  if (existsSync(gimPath)) {
    pass(`${npId} governance-integrity-matrix.json`, `${statSync(gimPath).size} bytes`);
  } else {
    fail(`${npId} governance-integrity-matrix.json`, "missing");
  }
}

function checkExecutionReports() {
  for (const npId of SCENARIOS) {
    const reportPath = path.join(REPORT_ROOT, `${npId}.md`);
    const size = fileSize(reportPath);
    if (size == null) fail(`Execution report: ${npId}.md`, "missing");
    else if (size <= MIN_EVIDENCE_BYTES) fail(`Execution report: ${npId}.md`, `${size} bytes`);
    else pass(`Execution report: ${npId}.md`, `${size} bytes`);
  }
}

function checkFinalGreenCheck() {
  const greenPath = path.join(WAVE4_ROOT, "FINAL_GREEN_CHECK.md");
  const size = fileSize(greenPath);
  if (size == null) fail("FINAL_GREEN_CHECK.md", "missing");
  else if (size <= MIN_EVIDENCE_BYTES) fail("FINAL_GREEN_CHECK.md", `${size} bytes`);
  else pass("FINAL_GREEN_CHECK.md", `${size} bytes`);
}

function main() {
  console.log("Sprint 8 Wave 4 — Artifact Verification\n");
  checkScripts();
  for (const npId of SCENARIOS) checkScenarioEvidence(npId);
  checkExecutionReports();
  checkFinalGreenCheck();

  const failed = results.filter((r) => r.status === "FAIL");
  const passed = results.filter((r) => r.status === "PASS");
  console.log("--- Results ---");
  for (const r of results) {
    console.log(`[${r.status}] ${r.check}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\nSummary: ${passed.length} PASS, ${failed.length} FAIL`);
  if (failed.length > 0) {
    console.log("\nOVERALL: FAIL");
    process.exit(1);
  }
  console.log("\nOVERALL: PASS");
}

main();
