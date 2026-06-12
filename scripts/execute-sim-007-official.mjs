/**
 * Official Runner — SIM-007 Handoff Payload Incomplete (Sprint 7B Phase 3D)
 *
 * Preconditions:
 *   - SIM-003 / SIM-005 / SIM-006 PASS / CLOSED
 *   - M-06 handoff_target guard merged
 *   - E0 baseline PASS
 *   - Fresh seed via scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-007
 *
 * Usage:
 *   npx tsx scripts/execute-sim-007-official.mjs --project=<id> --boq=<id>
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { prisma } from "../src/lib/db/prisma.ts";
import { validationService } from "../src/lib/services/validation.service.ts";
import { approvalService } from "../src/lib/services/approval.service.ts";
import { handoffService } from "../src/lib/services/handoff.service.ts";
import {
  exportService,
  EXPORT_BLOCKED_CODE,
} from "../src/lib/services/export.service.ts";
import { auditService } from "../src/lib/services/audit.service.ts";
import { boqSummaryReportService } from "../src/lib/services/boq-summary-report.service.ts";
import { AppError } from "../src/lib/utils/errors.ts";
import { HANDOFF_TARGET_REQUIRED_CODE } from "../src/lib/validations/handoff.ts";
import {
  deriveReadinessTier,
  deriveValidationStatus,
  inferValidationRun,
} from "../src/lib/validations/readiness.ts";

const EVIDENCE_DIR = path.resolve("docs/SPRINT_7B/evidence/SIM-007");
const EXPORT_DIR = path.join(EVIDENCE_DIR, "E7-export-result");
const REPORT_PATH = path.resolve("docs/SPRINT_7B/EXECUTION_REPORT/SIM-007.md");

const EXPECTED_HANDOFF_BLOCK_CODE = HANDOFF_TARGET_REQUIRED_CODE;
const ACCEPTABLE_HANDOFF_BLOCK_CODES = [EXPECTED_HANDOFF_BLOCK_CODE];

const CLOSED_SIM_BOQ_IDS = [
  "8f1376bb-092b-4250-b8d9-ef87fe739ca6", // SIM-001
  "8c1ad9f7-7d10-4ce8-bf4d-cee967d5a650", // SIM-002
  "514dfb95-9fea-4db3-8f82-8977735908ed", // SIM-003
  "95893441-3c00-4fb1-80eb-cea0a27ecf9e", // SIM-005
  "5de7fdf4-0a1e-424c-9415-799cc6e03fa6", // SIM-006
];

function buildValidationSummary(gate, results, version = {}) {
  const validation_run = inferValidationRun({
    validation_result_count: results.length,
    lock_status: version.lock_status ?? "",
    boq_status: version.status,
    unresolved_block_count: gate.unresolved_block_count,
    can_approve: gate.can_approve,
  });
  return {
    validation_run,
    validation_status: deriveValidationStatus(
      gate.unresolved_block_count,
      validation_run,
    ),
    finding_count: results.length,
    unresolved_block_count: gate.unresolved_block_count,
    can_approve: gate.can_approve,
    can_handoff: gate.can_handoff,
  };
}

function buildReadinessSnapshot(gate, results, version = {}) {
  const summary = buildValidationSummary(gate, results, version);
  const tier = deriveReadinessTier({
    validation_run: summary.validation_run,
    unresolved_block_count: gate.unresolved_block_count,
    open_warning_count: 0,
    can_approve: gate.can_approve,
  });
  return { tier, ...summary, gate };
}

function assertBoqVersionId(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: BOQ Version ID mismatch (expected ${expected}, got ${actual})`);
  }
}

function assertNoContamination(boqVersionId) {
  if (CLOSED_SIM_BOQ_IDS.includes(boqVersionId)) {
    throw new Error(
      `BOQ Version ID contamination: ${boqVersionId} matches a closed SIM namespace`,
    );
  }
}

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

function captureAppError(err) {
  if (err instanceof AppError) {
    return {
      blocked: true,
      code: err.code,
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    blocked: false,
    unexpected: true,
    message: err instanceof Error ? err.message : String(err),
  };
}

async function expectBlocked(label, fn, acceptableCodes) {
  try {
    const result = await fn();
    throw new Error(
      `${label}: expected block but operation succeeded: ${JSON.stringify(result)}`,
    );
  } catch (err) {
    const captured = captureAppError(err);
    if (!captured.blocked) {
      throw new Error(`${label}: unexpected error (not AppError): ${captured.message}`);
    }
    if (!acceptableCodes.includes(captured.code)) {
      throw new Error(
        `${label}: code ${captured.code} not in acceptable set [${acceptableCodes.join(", ")}]`,
      );
    }
    return captured;
  }
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

async function captureHandoffs(boqVersionId) {
  return prisma.handoff_records.findMany({
    where: { boq_version_id: boqVersionId },
    orderBy: { created_at: "desc" },
  });
}

async function main() {
  const args = parseArgs();
  const projectId = args.project ?? args.projectId;
  const boqVersionId = args.boq ?? args.boqVersionId;
  const microFixRequired = true;

  if (!projectId || !boqVersionId) {
    throw new Error(
      "Usage: npx tsx scripts/execute-sim-007-official.mjs --project=<id> --boq=<id>",
    );
  }

  assertNoContamination(boqVersionId);

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await mkdir(EXPORT_DIR, { recursive: true });

  const start = new Date();
  const timeline = [];
  const stepResults = [];
  let exportWarning = null;

  function recordStep(step, status, details = {}) {
    const entry = { step, status, at: new Date().toISOString(), ...details };
    stepResults.push(entry);
    console.log(`  [${status}] ${step}`);
  }

  // E1
  console.log("Step 1: capture seed payload");
  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1 seed", seed.boqVersion.boq_version_id, boqVersionId);

  if (seed.project.project_name !== "SIM-007 Handoff Payload Incomplete Project") {
    throw new Error(`Expected SIM-007 project name; got ${seed.project.project_name}`);
  }

  const e1Path = await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: "SIM-007",
    seed_profile: "handoff-incomplete",
    manifest_source: "docs/SPRINT_7A/scenario-seed-manifest.json",
    handoff_target: null,
    expected_handoff_block: EXPECTED_HANDOFF_BLOCK_CODE,
    ...seed,
  });
  recordStep("E1: seed payload captured", "PASS", {
    file: path.relative(process.cwd(), e1Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  // E2 pre-lock validation
  console.log("Step 2: runValidation (pre-lock)");
  await validationService.runValidation(boqVersionId);
  const preLockResults = await captureValidationResults(boqVersionId);
  const preLockGate = await validationService.getWorkflowGate(boqVersionId);
  const preLockSummary = buildValidationSummary(preLockGate, preLockResults, seed.boqVersion);

  if (!preLockGate.can_approve) {
    throw new Error(`Pre-lock expected can_approve=true; got ${preLockGate.can_approve}`);
  }
  recordStep("E2 (pre-lock): validation acceptable for approval path", "PASS", {
    can_approve: preLockGate.can_approve,
  });

  // E3 + E4 approval x4 → lock
  console.log("Step 3: approval x4 to Final Lock");
  const approvalSteps = [
    { actor: "engineer-001@sim007", role: "Engineer", expectedNext: "Engineer Review" },
    { actor: "engineer-001@sim007", role: "Engineer", expectedNext: "Manager Approval" },
    { actor: "manager-001@sim007", role: "Manager", expectedNext: "Director Approval" },
    { actor: "director-001@sim007", role: "Director", expectedNext: "Final Lock" },
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
        `Approval step ${i + 1} expected ${st.expectedNext}, got ${result.current_stage}`,
      );
    }
  }

  const finalWorkflow = await captureWorkflow(boqVersionId);
  const lockedVersion = await prisma.boq_versions.findUniqueOrThrow({
    where: { boq_version_id: boqVersionId },
  });
  if (lockedVersion.lock_status !== "Locked" || lockedVersion.status !== "Locked") {
    throw new Error("Expected BOQ Locked after Final Lock stage");
  }

  const e3Path = await writeJson("E3-workflow-state.json", {
    boq_version_id: boqVersionId,
    workflow: finalWorkflow,
    boq_status: lockedVersion.status,
    boq_lock_status: lockedVersion.lock_status,
  });
  const e4Path = await writeJson("E4-approval-gates.json", {
    boq_version_id: boqVersionId,
    expected_outcome: "setup_complete_locked",
    no_false_handoff_readiness: true,
    approval_results: approvalResults,
    note: "Approval path succeeds; handoff negative test follows in E5.",
  });
  recordStep("E3+E4: approval x4 + BOQ Locked", "PASS", {
    e3: path.relative(process.cwd(), e3Path),
    e4: path.relative(process.cwd(), e4Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E3+E4 captured (Locked)" });

  // E2 post-lock validation
  console.log("Step 3.5: runValidation (post-lock)");
  await validationService.runValidation(boqVersionId);
  const postLockResults = await captureValidationResults(boqVersionId);
  const postLockGate = await validationService.getWorkflowGate(boqVersionId);
  const postLockSummary = buildValidationSummary(
    postLockGate,
    postLockResults,
    lockedVersion,
  );

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    pre_lock: {
      validation_results: preLockResults,
      workflow_gate: preLockGate,
      validation_summary: preLockSummary,
    },
    post_lock: {
      validation_results: postLockResults,
      workflow_gate: postLockGate,
      validation_summary: postLockSummary,
    },
    expected_handoff_block_code: EXPECTED_HANDOFF_BLOCK_CODE,
    note: "Validation layer clean post-lock; handoff payload block enforced in E5.",
  });

  if (postLockGate.unresolved_block_count !== 0) {
    throw new Error(
      `Post-lock expected 0 unresolved BLOCK, got ${postLockGate.unresolved_block_count}`,
    );
  }
  if (postLockSummary.validation_status !== "Pass") {
    throw new Error(`Post-lock expected Pass, got ${postLockSummary.validation_status}`);
  }
  recordStep("E2 (post-lock): validation Pass + can_handoff gate open", "PASS", {
    validation_status: postLockSummary.validation_status,
    can_handoff: postLockGate.can_handoff,
  });

  const postLockReadiness = buildReadinessSnapshot(
    postLockGate,
    postLockResults,
    lockedVersion,
  );

  // E5 handoff blocked (missing handoff_target)
  console.log("Step 4: handoff blocked (missing handoff_target)");
  const handoffsBefore = await captureHandoffs(boqVersionId);
  const handoffAttempt1 = await expectBlocked(
    "E5 handoff attempt 1 (no target)",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        "director-001@sim007",
        "SIM-007 handoff attempt without handoff_target (must fail)",
      ),
    ACCEPTABLE_HANDOFF_BLOCK_CODES,
  );
  const handoffAttempt2 = await expectBlocked(
    "E5 handoff retry (explicit null target)",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        "director-001@sim007",
        "SIM-007 handoff retry with null target (must fail)",
        null,
      ),
    ACCEPTABLE_HANDOFF_BLOCK_CODES,
  );
  const handoffsAfter = await captureHandoffs(boqVersionId);

  if (handoffsAfter.length > handoffsBefore.length) {
    throw new Error("E5: handoff record must not be created when handoff_target missing");
  }
  if (handoffAttempt1.code !== EXPECTED_HANDOFF_BLOCK_CODE) {
    throw new Error(`E5 block reason mismatch: expected ${EXPECTED_HANDOFF_BLOCK_CODE}`);
  }
  if (!handoffAttempt1.message.includes("handoff_target")) {
    throw new Error(`E5 message must reference handoff_target: ${handoffAttempt1.message}`);
  }

  const e5Path = await writeJson("E5-handoff-record.json", {
    boq_version_id: boqVersionId,
    expected_outcome: "blocked_by_handoff_layer",
    expected_handoff_block_code: EXPECTED_HANDOFF_BLOCK_CODE,
    handoff_attempted: true,
    blocked_handoff_evidence: {
      attempt_1: handoffAttempt1,
      attempt_2: handoffAttempt2,
    },
    affected_field: "handoff_target",
    handoff_records_before: handoffsBefore,
    handoff_records_after: handoffsAfter,
    handoff_created: false,
    proof_no_handoff_created: handoffsAfter.length === handoffsBefore.length,
    retry_remains_blocked: handoffAttempt2.code === EXPECTED_HANDOFF_BLOCK_CODE,
    requestId_traceId_note: "Not supported on AppError — deferred M-07",
  });
  recordStep("E5: handoff blocked (HANDOFF_TARGET_REQUIRED)", "PASS", {
    code: handoffAttempt1.code,
    handoff_count: handoffsAfter.length,
    file: path.relative(process.cwd(), e5Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E5 captured (handoff blocked)" });

  // E6 composite readiness
  const e6Path = await writeJson("E6-readiness-status.json", {
    boq_version_id: boqVersionId,
    readiness_tier: postLockReadiness.tier,
    validation_summary: postLockSummary,
    gate: postLockGate,
    handoff_layer: {
      block_code: EXPECTED_HANDOFF_BLOCK_CODE,
      affected_field: "handoff_target",
      handoff_record_created: false,
      forward_handoff_blocked: true,
    },
    composite_operational_block: {
      manifest_expected_readiness: "Blocked",
      validation_content_acceptable_post_lock: true,
      handoff_blocks_incomplete_payload: true,
    },
    note: "Validation Ready post-lock; handoff layer blocks missing handoff_target.",
  });
  recordStep(`E6: composite readiness (validation tier=${postLockReadiness.tier})`, "PASS", {
    file: path.relative(process.cwd(), e6Path),
  });

  // E7 export / report consistency
  console.log("Step 5: export gate + report consistency");
  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );
  if (!exportReport) {
    throw new Error("E7: BOQ Summary Report not found");
  }
  assertBoqVersionId("E7 report", exportReport.boq_version_id, boqVersionId);

  if (exportReport.project.handoff_status.includes("Completed")) {
    throw new Error("E7: report must not show Completed handoff when handoff blocked");
  }
  if (exportReport.validation.validation_status !== postLockSummary.validation_status) {
    throw new Error("E2/E7 validation_status mismatch");
  }

  let exportExcelBlock = null;
  let exportPdfBlock = null;
  let exportSucceeded = false;
  try {
    await exportService.exportToExcel(projectId, boqVersionId);
    exportSucceeded = true;
  } catch (err) {
    exportExcelBlock = captureAppError(err);
  }
  try {
    await exportService.exportToPdf(projectId, boqVersionId);
    if (!exportSucceeded) exportSucceeded = true;
  } catch (err) {
    exportPdfBlock = captureAppError(err);
  }

  const exportBlocked =
    exportExcelBlock?.blocked && exportExcelBlock.code === EXPORT_BLOCKED_CODE;

  if (exportSucceeded && !exportBlocked) {
    exportWarning =
      "Export gate is validation-only; export technically allowed post-lock while handoff payload incomplete (handoff layer block documented in E5).";
  }

  const e7MetaPath = await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    expected_outcome: exportBlocked ? "blocked" : "no_official_export_artifacts",
    no_official_export_artifacts: true,
    xlsx_generated: false,
    pdf_generated: false,
    export_attempt: {
      excel: exportExcelBlock ?? (exportSucceeded ? { blocked: false, allowed: true } : null),
      pdf: exportPdfBlock ?? (exportSucceeded ? { blocked: false, allowed: true } : null),
    },
    handoff_alignment_with_e5: {
      handoff_layer_blocked: true,
      handoff_block_code: EXPECTED_HANDOFF_BLOCK_CODE,
      handoff_records_count: handoffsAfter.length,
      report_handoff_status: exportReport.project.handoff_status,
      report_does_not_show_false_completed_handoff: !exportReport.project.handoff_status.includes(
        "Completed",
      ),
    },
    report_validation_snapshot: {
      validation_status: exportReport.validation.validation_status,
      ready_status: exportReport.validation.ready_status,
      unresolved_blocks: exportReport.validation.unresolved_blocks,
      can_approve: exportReport.validation.can_approve,
      can_handoff: exportReport.validation.can_handoff,
    },
    e2_consistency: {
      post_lock_validation_status: postLockSummary.validation_status,
      e7_validation_status: exportReport.validation.validation_status,
      matches: exportReport.validation.validation_status === postLockSummary.validation_status,
    },
    export_gate_note: exportWarning ?? "Export blocked by validation gate.",
    requestId_traceId_note: "Not supported on AppError — deferred M-07",
  });

  recordStep("E7: export/report consistency captured (no xlsx/pdf artifacts)", "PASS", {
    export_blocked: exportBlocked,
    export_warning: exportWarning ?? null,
    metadata: path.relative(process.cwd(), e7MetaPath),
  });
  timeline.push({ at: new Date().toISOString(), event: "E7 captured" });

  // E8 audit
  console.log("Step 6: audit trail");
  const auditRows = await auditService.listByObject("boq_version", boqVersionId);
  const handoffAuditRows = auditRows.filter((r) => r.action_type === "handoff");

  const e8Path = await writeJson("E8-audit-trail.json", {
    object_type: "boq_version",
    object_id: boqVersionId,
    row_count: auditRows.length,
    rows: auditRows,
    block_evidence_summary: {
      validation_run_rows: auditRows.filter((r) =>
        String(r.new_value ?? "").includes("validation_run"),
      ).length,
      approve_rows: auditRows.filter((r) => r.action_type === "approve").length,
      handoff_rows: handoffAuditRows.length,
      note: "Rejected handoff attempts do not produce handoff audit rows (M-03).",
    },
  });

  if (handoffAuditRows.length > 0) {
    throw new Error(`E8: no successful handoff audit rows expected; got ${handoffAuditRows.length}`);
  }
  recordStep(`E8: audit trail captured (${auditRows.length} rows)`, "PASS", {
    handoff_audit_rows: handoffAuditRows.length,
    file: path.relative(process.cwd(), e8Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E8 captured" });

  // E9 + report
  const end = new Date();
  const durationMs = end.getTime() - start.getTime();
  const finalResult = exportWarning ? "PASS WITH WARNING" : "PASS";

  const e9Body = `# SIM-007 Handoff Payload Incomplete — Execution Note (E9) — OFFICIAL

| Field | Value |
|-------|-------|
| Run type | **Official Sprint 7B Phase 3D** |
| Scenario | SIM-007 Handoff Payload Incomplete |
| Result | **${finalResult}** |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Duration | ${durationMs} ms |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Micro-fix required (M-06) | ${microFixRequired ? "YES" : "NO"} |
| Expected handoff block | ${EXPECTED_HANDOFF_BLOCK_CODE} |
| Handoff attempt 1 code | ${handoffAttempt1.code} |
| Handoff attempt 2 code | ${handoffAttempt2.code} |
| Handoff records created | 0 |
| Post-lock validation status | ${postLockSummary.validation_status} |
| Readiness tier (validation) | ${postLockReadiness.tier} |
| Audit rows | ${auditRows.length} |
| Export warning | ${exportWarning ?? "none"} |

## Why SIM-007 blocked

Handoff Layer rejected \`createHandoff\` because **handoff_target** was null/omitted after BOQ reached Locked state. Block code **${EXPECTED_HANDOFF_BLOCK_CODE}** (403). Validation content was otherwise acceptable post-lock.

## Layer enforcement

- Validation: Pass post-lock (0 unresolved BLOCK)
- Approval: setup complete — no false handoff readiness in approval gates
- Handoff: **blocked** — no record, retry blocked
- Export/report: no false Completed handoff; ${exportWarning ? "export gate validation-only (see E7 warning)" : "export blocked or no artifacts"}

## Operational readiness

Operational Readiness PASS = **NOT CLAIMED**.

## Timeline

${timeline.map((t) => `- ${t.at} — ${t.event}`).join("\n")}
`;
  await writeFile(path.join(EVIDENCE_DIR, "E9-execution-note.md"), e9Body, "utf8");

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(
    REPORT_PATH,
    `# Sprint 7B Phase 3D — SIM-007 Handoff Payload Incomplete (Official Execution Report)

| Field | Value |
|-------|-------|
| Run type | **Official** |
| Result | **${finalResult}** |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Micro-fix (M-06) | Required and applied |
| Expected handoff block | ${EXPECTED_HANDOFF_BLOCK_CODE} |
| Actual handoff block | ${handoffAttempt1.code} |
| Readiness (validation post-lock) | ${postLockReadiness.tier} |
| Approval | x4 stages + Final Lock **PASS** (setup) |
| Handoff | **Blocked** — 0 records |
| Export | No official artifacts; ${exportWarning ? "validation-only gate warning" : "blocked"} |
| Audit rows | ${auditRows.length} |
| Evidence | docs/SPRINT_7B/evidence/SIM-007/ |
| Final green check | docs/SPRINT_7B/PHASE3_SIM-007/FINAL_GREEN_CHECK.md |

Operational Readiness PASS **NOT CLAIMED**.
`,
    "utf8",
  );

  console.log(`\nSIM-007 OFFICIAL ${finalResult}`);
  console.log(
    JSON.stringify(
      {
        scenario: "SIM-007",
        result: finalResult,
        durationMs,
        handoffBlockCode: handoffAttempt1.code,
        exportWarning,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (err) => {
    console.error("\nSIM-007 FAIL — STOP ON FAIL");
    console.error(err);
    try {
      await mkdir(EVIDENCE_DIR, { recursive: true });
      await writeFile(
        path.join(EVIDENCE_DIR, "E9-execution-note.md"),
        `# SIM-007 FAIL\n\n${err?.message ?? err}\n`,
        "utf8",
      );
      await mkdir(path.resolve("docs/SPRINT_7B/PHASE3_SIM-007"), { recursive: true });
      await writeFile(
        path.resolve("docs/SPRINT_7B/PHASE3_SIM-007/FINAL_GREEN_CHECK.md"),
        `# SIM-007 — **BLOCKED**\n\n**Recommendation: BLOCKED**\n`,
        "utf8",
      );
    } catch {
      /* ignore */
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 50);
  });

void performance.now();
