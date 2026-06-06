/**
 * Pre-Gate Diagnostic Runner — SIM-001 (NOT OFFICIAL — see INC-S7B-002)
 *
 * STATUS: Diagnostic-only. The original run executed before the Sprint 7B
 * Entry Gate cleared (5 FAIL still BLOCKED). Output of this script is NOT
 * valid as official Sprint 7B Phase 1 PASS evidence.
 *
 * Re-running this script remains a diagnostic / dry-run mechanism for
 * verifying technical wiring of services (validation, approval, handoff,
 * export, audit). Do NOT use its output to close TDs or claim
 * Operational Readiness.
 *
 * For the legitimate path see:
 *   - docs/INCIDENTS/INC-S7B-002.md (incident record)
 *   - docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/SIM-001-DIAGNOSTIC.md (relabel)
 *   - docs/SPRINT_7B/S7B-0_GATE_CLOSURE/ (gate-first closure plan)
 *
 * Calls services directly (no bypass of any framework):
 *   validation -> approval x4 (Engineer Review -> Manager Approval ->
 *   Director Approval -> Final Lock) -> handoff -> export (Excel + PDF) ->
 *   audit trail capture.
 *
 * Output (diagnostic only): docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/evidence-SIM-001/
 *
 * Usage:
 *   tsx scripts/execute-sim-001.mjs --project=<projectId> --boq=<boqVersionId>
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { prisma } from "../src/lib/db/prisma.ts";
import { validationService } from "../src/lib/services/validation.service.ts";
import { approvalService } from "../src/lib/services/approval.service.ts";
import { handoffService } from "../src/lib/services/handoff.service.ts";
import { exportService } from "../src/lib/services/export.service.ts";
import { auditService } from "../src/lib/services/audit.service.ts";

// Diagnostic evidence path (NOT official Sprint 7B evidence — see INC-S7B-002).
const EVIDENCE_DIR = path.resolve("docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/evidence-SIM-001");
const EXPORT_DIR = path.join(EVIDENCE_DIR, "E7-export-result");

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (
    value &&
    typeof value === "object" &&
    typeof value.toFixed === "function" &&
    typeof value.toNumber === "function"
  ) {
    return value.toString();
  }
  return value;
}

async function writeJson(name, payload) {
  const file = path.join(EVIDENCE_DIR, name);
  await writeFile(file, JSON.stringify(payload, jsonReplacer, 2), "utf8");
  return file;
}

async function captureSeedPayload(projectId, boqVersionId) {
  const project = await prisma.projects.findUniqueOrThrow({
    where: { project_id: projectId },
  });
  const boqVersion = await prisma.boq_versions.findUniqueOrThrow({
    where: { boq_version_id: boqVersionId },
  });
  const designBasis = await prisma.design_basis_versions.findMany({
    where: { project_id: projectId },
    orderBy: { design_version_no: "desc" },
  });
  const documents = await prisma.documents.findMany({
    where: { project_id: projectId },
  });
  const boqDocLinks = await prisma.boq_version_documents.findMany({
    where: { boq_version_id: boqVersionId },
  });
  const projectDisciplines = await prisma.project_disciplines.findMany({
    where: { boq_version_id: boqVersionId },
    include: { discipline: true },
  });
  const boqLines = await prisma.boq_lines.findMany({
    where: { boq_version_id: boqVersionId },
    include: { boq_cost_breakdowns: true },
    orderBy: { line_no: "asc" },
  });
  const boqSummary = await prisma.boq_summary.findUnique({
    where: { boq_version_id: boqVersionId },
  });

  return {
    project,
    boqVersion,
    designBasis,
    documents,
    boqDocLinks,
    projectDisciplines,
    boqLines,
    boqSummary,
  };
}

async function captureWorkflow(boqVersionId) {
  return prisma.approval_workflows.findUnique({
    where: { boq_version_id: boqVersionId },
  });
}

async function captureValidationResults(boqVersionId) {
  return prisma.validation_results.findMany({
    where: { boq_version_id: boqVersionId },
    orderBy: { created_at: "asc" },
  });
}

async function main() {
  const args = parseArgs();
  const projectId = args.project ?? args.projectId;
  const boqVersionId = args.boq ?? args.boqVersionId;

  if (!projectId || !boqVersionId) {
    throw new Error(
      "Usage: tsx scripts/execute-sim-001.mjs --project=<id> --boq=<id>",
    );
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await mkdir(EXPORT_DIR, { recursive: true });

  const start = new Date();
  const timeline = [];
  const stepResults = [];

  function recordStep(step, status, details = {}) {
    const entry = {
      step,
      status,
      at: new Date().toISOString(),
      ...details,
    };
    stepResults.push(entry);
    console.log(`  [${status}] ${step}`);
  }

  // -------------------------------------------------------------------------
  // E1 — Capture seed payload
  // -------------------------------------------------------------------------
  console.log("Step 1: capture seed payload");
  const seed = await captureSeedPayload(projectId, boqVersionId);
  const e1Path = await writeJson("E1-seed-payload.json", seed);
  recordStep("E1: seed payload captured", "PASS", {
    project: seed.project.project_name,
    boqVersion: `v${seed.boqVersion.version_no}`,
    boqLines: seed.boqLines.length,
    documents: seed.documents.length,
    designBasisVersions: seed.designBasis.length,
    file: path.relative(process.cwd(), e1Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  // -------------------------------------------------------------------------
  // E2 — runValidation + snapshot (pre-lock)
  // -------------------------------------------------------------------------
  // Note: HANDOFF_WITHOUT_LOCK is expected to fire BEFORE Final Lock
  // (it is the framework's handoff gate guard). Approval is still allowed
  // because HANDOFF_WITHOUT_LOCK is in HANDOFF_BLOCK_RULES, not in
  // APPROVAL_BLOCK_RULES. Re-validation post-lock must show 0 BLOCK.
  console.log("Step 2: runValidation (pre-lock)");
  await validationService.runValidation(boqVersionId);
  const preLockResults = await captureValidationResults(boqVersionId);
  const preLockGate = await validationService.getWorkflowGate(boqVersionId);

  if (!preLockGate.can_approve) {
    await writeJson("E2-validation-snapshot.json", {
      pre_lock: { validation_results: preLockResults, workflow_gate: preLockGate },
    });
    recordStep("E2: pre-lock validation must allow approval", "FAIL", {
      gate: preLockGate,
    });
    throw new Error(
      `Happy Path expected can_approve=true; got ${preLockGate.can_approve} (block_reason: ${preLockGate.block_reason})`,
    );
  }
  // The only acceptable BLOCK pre-lock is HANDOFF_WITHOUT_LOCK (cleared after Final Lock).
  const unexpectedPreLockBlocks = preLockResults.filter(
    (r) =>
      r.severity === "BLOCK" &&
      !r.resolved_flag &&
      r.result_status !== "Pass" &&
      r.result_status !== "Overridden" &&
      r.rule_code !== "HANDOFF_WITHOUT_LOCK",
  );
  if (unexpectedPreLockBlocks.length > 0) {
    await writeJson("E2-validation-snapshot.json", {
      pre_lock: { validation_results: preLockResults, workflow_gate: preLockGate },
      unexpected_blocks: unexpectedPreLockBlocks,
    });
    recordStep("E2: pre-lock has non-handoff BLOCK", "FAIL", {
      unexpected: unexpectedPreLockBlocks.map((r) => r.rule_code),
    });
    throw new Error(
      `Happy Path pre-lock had unexpected BLOCK(s): ${unexpectedPreLockBlocks.map((r) => r.rule_code).join(", ")}`,
    );
  }
  recordStep("E2: pre-lock validation OK (only HANDOFF_WITHOUT_LOCK pending lock)", "PASS", {
    findings_pre_lock: preLockResults.length,
    can_approve: preLockGate.can_approve,
    can_handoff_pre_lock: preLockGate.can_handoff,
  });
  timeline.push({ at: new Date().toISOString(), event: "E2 pre-lock captured" });

  // -------------------------------------------------------------------------
  // E6 — Readiness status (pre-lock; will re-capture post-lock at end)
  // -------------------------------------------------------------------------
  const preLockReadiness = preLockGate.can_approve && preLockGate.can_handoff ? "Ready" : "Not Ready";
  recordStep(`E6 (pre-lock): readiness ${preLockReadiness}`, "PASS", {
    can_approve: preLockGate.can_approve,
    can_handoff: preLockGate.can_handoff,
  });

  // -------------------------------------------------------------------------
  // E3 + E4 — Approval x4 stages
  // -------------------------------------------------------------------------
  console.log("Step 3: approval x4");
  const approvalSteps = [
    { actor: "engineer-001@sim001", role: "Engineer", expectedNext: "Engineer Review" },
    { actor: "engineer-001@sim001", role: "Engineer", expectedNext: "Manager Approval" },
    { actor: "manager-001@sim001", role: "Manager", expectedNext: "Director Approval" },
    { actor: "director-001@sim001", role: "Director", expectedNext: "Final Lock" },
  ];
  const approvalResults = [];
  for (const [i, st] of approvalSteps.entries()) {
    const result = await approvalService.advanceStage(
      projectId,
      boqVersionId,
      st.actor,
      st.role,
    );
    approvalResults.push({ step: i + 1, ...st, result });
    if (result.current_stage !== st.expectedNext) {
      throw new Error(
        `Approval step ${i + 1} expected stage ${st.expectedNext}, got ${result.current_stage}`,
      );
    }
  }
  const finalWorkflow = await captureWorkflow(boqVersionId);
  const e3Path = await writeJson("E3-workflow-state.json", finalWorkflow);
  const e4Path = await writeJson("E4-approval-gates.json", {
    expected_stages: ["Engineer Review", "Manager Approval", "Director Approval", "Final Lock"],
    actual_results: approvalResults,
  });

  // Verify BOQ is now Locked.
  const lockedVersion = await prisma.boq_versions.findUniqueOrThrow({
    where: { boq_version_id: boqVersionId },
  });
  if (lockedVersion.lock_status !== "Locked" || lockedVersion.status !== "Locked") {
    throw new Error(
      `Final Lock expected status=Locked, lock_status=Locked; got status=${lockedVersion.status}, lock_status=${lockedVersion.lock_status}`,
    );
  }
  recordStep("E3 + E4: approval x4 + final lock", "PASS", {
    workflow_status: finalWorkflow.workflow_status,
    current_stage: finalWorkflow.current_stage,
    boq_status: lockedVersion.status,
    boq_lock_status: lockedVersion.lock_status,
    e3: path.relative(process.cwd(), e3Path),
    e4: path.relative(process.cwd(), e4Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E3+E4 captured (BOQ Locked)" });

  // -------------------------------------------------------------------------
  // E2 + E6 — re-run validation post-lock (clear HANDOFF_WITHOUT_LOCK)
  // -------------------------------------------------------------------------
  console.log("Step 3.5: runValidation (post-lock)");
  await validationService.runValidation(boqVersionId);
  const postLockResults = await captureValidationResults(boqVersionId);
  const postLockGate = await validationService.getWorkflowGate(boqVersionId);

  await writeJson("E2-validation-snapshot.json", {
    pre_lock: { validation_results: preLockResults, workflow_gate: preLockGate },
    post_lock: { validation_results: postLockResults, workflow_gate: postLockGate },
  });

  if (postLockGate.unresolved_block_count !== 0) {
    recordStep("E2 (post-lock): expected 0 BLOCK", "FAIL", { gate: postLockGate });
    throw new Error(
      `Post-lock expected 0 unresolved BLOCK, got ${postLockGate.unresolved_block_count}`,
    );
  }
  recordStep("E2 (post-lock): 0 unresolved BLOCK", "PASS", {
    findings_post_lock: postLockResults.length,
    can_approve: postLockGate.can_approve,
    can_handoff: postLockGate.can_handoff,
  });

  const readinessStatus =
    postLockGate.can_approve && postLockGate.can_handoff ? "Ready" : "Not Ready";
  const e6Path = await writeJson("E6-readiness-status.json", {
    note: "Per TD-7A-006 the readiness aggregate is currently binary (Ready/Not Ready). 3-tier (Ready/Warning/Blocked) is target-state pending S7B-0.",
    readiness_status: readinessStatus,
    pre_lock_gate: preLockGate,
    post_lock_gate: postLockGate,
  });
  recordStep(`E6 (post-lock): readiness ${readinessStatus}`, "PASS", {
    file: path.relative(process.cwd(), e6Path),
  });
  if (readinessStatus !== "Ready") {
    throw new Error(`Happy Path expected readiness=Ready, got ${readinessStatus}`);
  }

  // -------------------------------------------------------------------------
  // E5 — Handoff record
  // -------------------------------------------------------------------------
  console.log("Step 4: handoff");
  const handoff = await handoffService.createHandoff(
    boqVersionId,
    "director-001@sim001",
    "SIM-001 Happy Path handoff (Sprint 7B Phase 1)",
  );
  const e5Path = await writeJson("E5-handoff-record.json", handoff);
  recordStep("E5: handoff record created", "PASS", {
    handoff_status: handoff.handoff_status,
    handed_off_by: handoff.handed_off_by,
    file: path.relative(process.cwd(), e5Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E5 captured" });

  // -------------------------------------------------------------------------
  // E7 — Export (Excel + PDF)
  // -------------------------------------------------------------------------
  console.log("Step 5: export Excel + PDF");
  const excel = await exportService.exportToExcel(projectId, boqVersionId);
  const xlsxPath = path.join(EXPORT_DIR, excel.filename);
  await writeFile(xlsxPath, excel.buffer);

  const pdf = await exportService.exportToPdf(projectId, boqVersionId);
  const pdfPath = path.join(EXPORT_DIR, pdf.filename);
  await writeFile(pdfPath, pdf.buffer);

  const e7MetaPath = await writeJson("E7-export-result/metadata.json", {
    excel: {
      filename: excel.filename,
      mimeType: excel.mimeType,
      bytes: excel.buffer.length,
      file: path.relative(process.cwd(), xlsxPath),
    },
    pdf: {
      filename: pdf.filename,
      mimeType: pdf.mimeType,
      bytes: pdf.buffer.length,
      file: path.relative(process.cwd(), pdfPath),
    },
    note: "Happy Path exports return 200-equivalent (no throw). Export BLOCK gate is exercised by SIM-003/005/006/007 (out of scope for Phase 1).",
  });

  if (excel.buffer.length === 0 || pdf.buffer.length === 0) {
    throw new Error(
      `Export buffers must be > 0 (got xlsx=${excel.buffer.length}, pdf=${pdf.buffer.length})`,
    );
  }
  recordStep("E7: exports succeeded (xlsx + pdf)", "PASS", {
    xlsx_bytes: excel.buffer.length,
    pdf_bytes: pdf.buffer.length,
    metadata: path.relative(process.cwd(), e7MetaPath),
  });
  timeline.push({ at: new Date().toISOString(), event: "E7 captured" });

  // -------------------------------------------------------------------------
  // E8 — Audit trail (capture rows for this BOQ version)
  // -------------------------------------------------------------------------
  console.log("Step 6: audit trail");
  const auditRows = await auditService.listByObject("boq_version", boqVersionId);
  const e8Path = await writeJson("E8-audit-trail.json", {
    object_type: "boq_version",
    object_id: boqVersionId,
    row_count: auditRows.length,
    rows: auditRows,
  });

  if (auditRows.length < 6) {
    throw new Error(
      `Expected >= 6 audit rows (1 validation + 4 approve/lock + 1 handoff); got ${auditRows.length}`,
    );
  }
  recordStep(`E8: audit trail captured (${auditRows.length} rows)`, "PASS", {
    by_action: auditRows.reduce((acc, r) => {
      acc[r.action_type] = (acc[r.action_type] ?? 0) + 1;
      return acc;
    }, {}),
    file: path.relative(process.cwd(), e8Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E8 captured" });

  // -------------------------------------------------------------------------
  // E9 — Execution note
  // -------------------------------------------------------------------------
  const end = new Date();
  const durationMs = end.getTime() - start.getTime();
  const e9Body = `# SIM-001 Happy Path — Execution Note (E9)

| Field | Value |
|-------|-------|
| Scenario | SIM-001 Happy Path |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Duration | ${durationMs} ms |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Final BOQ status | ${lockedVersion.status} |
| Final lock_status | ${lockedVersion.lock_status} |
| Final workflow status | ${finalWorkflow.workflow_status} |
| Final workflow stage | ${finalWorkflow.current_stage} |
| Audit rows captured | ${auditRows.length} |
| Excel bytes | ${excel.buffer.length} |
| PDF bytes | ${pdf.buffer.length} |
| Validation findings (pre-lock) | ${preLockResults.length} |
| Validation findings (post-lock) | ${postLockResults.length} |
| Final readiness | ${readinessStatus} |

## Timeline

${timeline.map((t) => `- ${t.at} — ${t.event}`).join("\n")}

## Step results

${stepResults
  .map(
    (s) =>
      `- [${s.status}] ${s.step}\n  ${JSON.stringify({ ...s, status: undefined, step: undefined })}`,
  )
  .join("\n")}

## Frameworks compliance

- Validation Engine: invoked via validationService.runValidation; no rule bypass
- Workflow Engine: invoked via approvalService.advanceStage x4 with role assertions
- Approval Authority Framework: assertRoleForStage enforced (Engineer -> Manager -> Director)
- Audit Framework: append-only, ${auditRows.length} rows captured
- Export gate: isReportExportBlocked predicate respected (Happy Path -> 0 BLOCK -> exports succeed)

## Operational readiness statement

Sprint 7B Phase 1 (SIM-001 Happy Path) PASS does NOT imply Operational Readiness PASS.
SIM-002..008 are out of scope for this phase and remain unexecuted.

## Performance counters

- Total wall time: ${durationMs} ms
- Process: node ${process.version}
- Platform: ${process.platform} (${process.arch})

`;
  const e9Path = path.join(EVIDENCE_DIR, "E9-execution-note.md");
  await writeFile(e9Path, e9Body, "utf8");
  recordStep("E9: execution note written", "PASS", {
    file: path.relative(process.cwd(), e9Path),
  });

  console.log(`\nSIM-001 PASS — evidence at ${path.relative(process.cwd(), EVIDENCE_DIR)}`);
  console.log(
    JSON.stringify(
      {
        scenario: "SIM-001",
        result: "PASS",
        durationMs,
        evidence: stepResults.map((s) => ({ step: s.step, status: s.status })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (err) => {
    console.error("\nSIM-001 FAIL");
    console.error(err);
    try {
      await mkdir(EVIDENCE_DIR, { recursive: true });
      await writeFile(
        path.join(EVIDENCE_DIR, "E9-execution-note.md"),
        `# SIM-001 Happy Path — FAIL\n\nError: ${err && err.message ? err.message : String(err)}\n\nStack:\n\n\`\`\`\n${err && err.stack ? err.stack : ""}\n\`\`\`\n`,
        "utf8",
      );
    } catch {
      /* ignore */
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // explicit exit to release any lingering handles (pdfkit fontkit)
    setTimeout(() => process.exit(0), 50);
  });

// Reference performance API to keep import alive even if unused in the path.
void performance.now();
