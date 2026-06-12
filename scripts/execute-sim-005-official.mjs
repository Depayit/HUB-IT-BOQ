/**
 * Official Runner — SIM-005 Missing Discipline Block (Sprint 7B Phase 3B)
 *
 * Preconditions (must be satisfied BEFORE running):
 *   - SIM-003 PASS / CLOSED
 *   - E0 baseline PASS (typecheck + test)
 *   - Fresh DB seed via scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-005
 *
 * Output (official evidence):
 *   - docs/SPRINT_7B/evidence/SIM-005/E1..E9
 *   - docs/SPRINT_7B/EXECUTION_REPORT/SIM-005.md
 *
 * Stop-on-fail: approval/handoff/export success with unresolved BLOCK = immediate FAIL.
 *
 * Usage:
 *   npx tsx scripts/execute-sim-005-official.mjs --project=<projectId> --boq=<boqVersionId>
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
import {
  deriveReadinessTier,
  deriveValidationStatus,
  inferValidationRun,
} from "../src/lib/validations/readiness.ts";

const EVIDENCE_DIR = path.resolve("docs/SPRINT_7B/evidence/SIM-005");
const EXPORT_DIR = path.join(EVIDENCE_DIR, "E7-export-result");
const REPORT_PATH = path.resolve("docs/SPRINT_7B/EXECUTION_REPORT/SIM-005.md");

const EXPECTED_BLOCK_RULES = ["DISCIPLINE_NO_LINES"];
const ACCEPTABLE_APPROVAL_BLOCK_CODES = ["VALIDATION_BLOCK"];
const ACCEPTABLE_HANDOFF_BLOCK_CODES = [
  "VALIDATION_BLOCK",
  "BOQ_NOT_LOCKED",
];

/** Prior closed SIM BOQ Version IDs — contamination check */
const CLOSED_SIM_BOQ_IDS = [
  "8f1376bb-092b-4250-b8d9-ef87fe739ca6", // SIM-001
  "8c1ad9f7-7d10-4ce8-bf4d-cee967d5a650", // SIM-002
  "514dfb95-9fea-4db3-8f82-8977735908ed", // SIM-003
];

function countOpenBlocks(results) {
  return results.filter(
    (r) =>
      r.severity === "BLOCK" &&
      !r.resolved_flag &&
      r.result_status !== "Pass" &&
      r.result_status !== "Overridden",
  ).length;
}

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

function extractBlockCountFromMessage(message) {
  const m = message.match(/(\d+)\s*รายการ/);
  return m ? Number(m[1]) : null;
}

async function main() {
  const args = parseArgs();
  const projectId = args.project ?? args.projectId;
  const boqVersionId = args.boq ?? args.boqVersionId;

  if (!projectId || !boqVersionId) {
    throw new Error(
      "Usage: npx tsx scripts/execute-sim-005-official.mjs --project=<id> --boq=<id>",
    );
  }

  assertNoContamination(boqVersionId);

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
  assertBoqVersionId("E1 seed", seed.boqVersion.boq_version_id, boqVersionId);

  if (seed.project.project_name !== "SIM-005 Missing Discipline Block Project") {
    throw new Error(
      `Expected SIM-005 project name; got ${seed.project.project_name}`,
    );
  }
  if (!seed.designBasis.some((d) => d.approval_status === "Approved")) {
    throw new Error("SIM-005 seed must have Approved design basis (extends SIM-001)");
  }
  if (!seed.documents.some((d) => d.document_type === "TOR")) {
    throw new Error("SIM-005 seed must include TOR document (extends SIM-001)");
  }
  if (seed.boqLines.length > 0) {
    throw new Error(
      `SIM-005 seed must have zero BOQ lines; got ${seed.boqLines.length}`,
    );
  }
  const includedDisciplines = seed.projectDisciplines.filter((d) => d.included_flag);
  if (includedDisciplines.length < 1) {
    throw new Error("SIM-005 seed must have at least one included discipline");
  }

  const e1Path = await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: "SIM-005",
    seed_profile: "discipline-block",
    manifest_source: "docs/SPRINT_7A/scenario-seed-manifest.json",
    ...seed,
  });
  recordStep("E1: seed payload captured", "PASS", {
    project: seed.project.project_name,
    design_basis_status: seed.designBasis[0]?.approval_status,
    documents: seed.documents.map((d) => d.document_type),
    file: path.relative(process.cwd(), e1Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  // -------------------------------------------------------------------------
  // E2 — runValidation + snapshot
  // -------------------------------------------------------------------------
  console.log("Step 2: runValidation");
  await validationService.runValidation(boqVersionId);
  const validationResults = await captureValidationResults(boqVersionId);
  const gate = await validationService.getWorkflowGate(boqVersionId);
  const validationSummary = buildValidationSummary(gate, validationResults, seed.boqVersion);

  const openBlockRules = [
    ...new Set(
      validationResults
        .filter(
          (r) =>
            r.severity === "BLOCK" &&
            !r.resolved_flag &&
            r.result_status !== "Pass" &&
            r.result_status !== "Overridden",
        )
        .map((r) => r.rule_code),
    ),
  ];
  const missingBlockRules = EXPECTED_BLOCK_RULES.filter(
    (code) => !openBlockRules.includes(code),
  );

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    validation_results: validationResults,
    workflow_gate: gate,
    validation_summary: validationSummary,
    expected_block_rules: EXPECTED_BLOCK_RULES,
    open_block_rules: openBlockRules,
  });

  if (missingBlockRules.length > 0) {
    recordStep("E2: expected BLOCK rules present", "FAIL", { missing: missingBlockRules });
    throw new Error(`E2 missing expected BLOCK rules: ${missingBlockRules.join(", ")}`);
  }
  if (gate.unresolved_block_count <= 0) {
    recordStep("E2: unresolved_block_count > 0", "FAIL", { gate });
    throw new Error(`E2 expected unresolved_block_count > 0, got ${gate.unresolved_block_count}`);
  }
  if (gate.can_approve) {
    recordStep("E2: can_approve must be false", "FAIL", { gate });
    throw new Error("E2 expected can_approve=false with unresolved BLOCK");
  }
  recordStep("E2: validation BLOCK present", "PASS", {
    unresolved_block_count: gate.unresolved_block_count,
    open_block_rules: openBlockRules,
    can_approve: gate.can_approve,
  });
  timeline.push({ at: new Date().toISOString(), event: "E2 captured" });

  // -------------------------------------------------------------------------
  // E6 — Readiness status
  // -------------------------------------------------------------------------
  const readiness = buildReadinessSnapshot(gate, validationResults, seed.boqVersion);
  const e6Path = await writeJson("E6-readiness-status.json", {
    boq_version_id: boqVersionId,
    readiness_tier: readiness.tier,
    validation_summary: validationSummary,
    gate,
    note: "Blocked Path — readiness must remain Blocked while unresolved BLOCK persists.",
  });
  if (readiness.tier !== "Blocked") {
    throw new Error(`E6 expected readiness tier=Blocked, got ${readiness.tier}`);
  }
  recordStep(`E6: readiness ${readiness.tier}`, "PASS", {
    file: path.relative(process.cwd(), e6Path),
  });

  // -------------------------------------------------------------------------
  // E4 — Approval blocked (first attempt + retry)
  // -------------------------------------------------------------------------
  console.log("Step 3: approval blocked");
  const approvalAttempt1 = await expectBlocked(
    "E4 approval attempt 1",
    () =>
      approvalService.advanceStage(
        projectId,
        boqVersionId,
        "engineer-001@sim005",
        "Engineer",
      ),
    ACCEPTABLE_APPROVAL_BLOCK_CODES,
  );
  const approvalAttempt2 = await expectBlocked(
    "E4 approval retry",
    () =>
      approvalService.advanceStage(
        projectId,
        boqVersionId,
        "engineer-001@sim005",
        "Engineer",
      ),
    ACCEPTABLE_APPROVAL_BLOCK_CODES,
  );

  const workflowAfterBlock = await captureWorkflow(boqVersionId);
  const e3Path = await writeJson("E3-workflow-state.json", {
    boq_version_id: boqVersionId,
    workflow: workflowAfterBlock,
    note: "No workflow advance expected while approval is blocked.",
    boq_status: seed.boqVersion.status,
    boq_lock_status: seed.boqVersion.lock_status,
  });
  const e4Path = await writeJson("E4-approval-gates.json", {
    boq_version_id: boqVersionId,
    expected_outcome: "blocked",
    no_false_approval: true,
    approval_rejection_evidence: {
      attempt_1: approvalAttempt1,
      attempt_2: approvalAttempt2,
    },
    acceptable_codes: ACCEPTABLE_APPROVAL_BLOCK_CODES,
    workflow_after_attempts: workflowAfterBlock,
    can_approve_from_page: (await approvalService.getPageData(projectId, boqVersionId))
      ?.can_approve,
    requestId_traceId_note: "Not supported on AppError — deferred M-07 (S9/S10/V2)",
  });

  if (workflowAfterBlock !== null) {
    throw new Error("E4: workflow must not be created when approval is blocked");
  }
  recordStep("E4: approval blocked (no false approval)", "PASS", {
    attempt_1_code: approvalAttempt1.code,
    attempt_2_code: approvalAttempt2.code,
    workflow_created: false,
    e4: path.relative(process.cwd(), e4Path),
    e3: path.relative(process.cwd(), e3Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E3+E4 captured (approval blocked)" });

  // -------------------------------------------------------------------------
  // E5 — Handoff blocked / not created
  // -------------------------------------------------------------------------
  console.log("Step 4: handoff blocked");
  const handoffsBefore = await captureHandoffs(boqVersionId);
  const handoffAttempt = await expectBlocked(
    "E5 handoff attempt",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        "director-001@sim005",
        "SIM-005 Missing Discipline Block handoff attempt (must fail)",
        "ClientHandover",
      ),
    ACCEPTABLE_HANDOFF_BLOCK_CODES,
  );
  const handoffsAfter = await captureHandoffs(boqVersionId);

  const e5Path = await writeJson("E5-handoff-record.json", {
    boq_version_id: boqVersionId,
    expected_outcome: "blocked_or_not_created",
    blocked_handoff_evidence: handoffAttempt,
    handoff_records_before: handoffsBefore,
    handoff_records_after: handoffsAfter,
    handoff_created: handoffsAfter.length > handoffsBefore.length,
    proof_no_handoff_created: handoffsAfter.length === handoffsBefore.length,
  });

  if (handoffsAfter.length > handoffsBefore.length) {
    throw new Error("E5: handoff record must not be created when BLOCK exists");
  }
  recordStep("E5: handoff blocked (no record created)", "PASS", {
    code: handoffAttempt.code,
    handoff_count: handoffsAfter.length,
    file: path.relative(process.cwd(), e5Path),
  });
  timeline.push({ at: new Date().toISOString(), event: "E5 captured (handoff blocked)" });

  // -------------------------------------------------------------------------
  // E7 — Export blocked (Excel + PDF) + E2 consistency
  // -------------------------------------------------------------------------
  console.log("Step 5: export blocked");
  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );
  if (!exportReport) {
    throw new Error("E7: BOQ Summary Report not found");
  }
  assertBoqVersionId("E7 report", exportReport.boq_version_id, boqVersionId);

  const exportExcelBlock = await expectBlocked(
    "E7 exportToExcel",
    () => exportService.exportToExcel(projectId, boqVersionId),
    [EXPORT_BLOCKED_CODE],
  );
  const exportPdfBlock = await expectBlocked(
    "E7 exportToPdf retry",
    () => exportService.exportToPdf(projectId, boqVersionId),
    [EXPORT_BLOCKED_CODE],
  );

  const excelBlockCount = extractBlockCountFromMessage(exportExcelBlock.message);
  const pdfBlockCount = extractBlockCountFromMessage(exportPdfBlock.message);
  if (excelBlockCount !== gate.unresolved_block_count) {
    throw new Error(
      `E2/E7 block count mismatch: E2=${gate.unresolved_block_count} export=${excelBlockCount}`,
    );
  }
  if (pdfBlockCount !== gate.unresolved_block_count) {
    throw new Error(
      `E2/E7 PDF block count mismatch: E2=${gate.unresolved_block_count} export=${pdfBlockCount}`,
    );
  }

  const e7MetaPath = await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    expected_outcome: "blocked",
    no_official_export_artifacts: true,
    xlsx_generated: false,
    pdf_generated: false,
    blocked_export_response: {
      excel: exportExcelBlock,
      pdf: exportPdfBlock,
    },
    report_validation_snapshot: {
      validation_status: exportReport.validation.validation_status,
      ready_status: exportReport.validation.ready_status,
      unresolved_blocks: exportReport.validation.unresolved_blocks,
      can_approve: exportReport.validation.can_approve,
      can_handoff: exportReport.validation.can_handoff,
    },
    e2_consistency: {
      e2_unresolved_block_count: gate.unresolved_block_count,
      e7_unresolved_blocks: exportReport.validation.unresolved_blocks,
      export_message_block_count: excelBlockCount,
      matches: exportReport.validation.unresolved_blocks === gate.unresolved_block_count,
    },
    requestId_traceId_note: "Not supported on AppError — deferred M-07 (S9/S10/V2)",
    note: "Blocked Path — no xlsx/pdf files generated; EXPORT_BLOCKED 400 captured.",
  });

  if (exportReport.validation.unresolved_blocks !== gate.unresolved_block_count) {
    throw new Error(
      `E2/E7 report unresolved_blocks mismatch: E2=${gate.unresolved_block_count} report=${exportReport.validation.unresolved_blocks}`,
    );
  }
  recordStep("E7: export blocked + E2 consistency", "PASS", {
    code: EXPORT_BLOCKED_CODE,
    block_count: excelBlockCount,
    ready_status: exportReport.validation.ready_status,
    metadata: path.relative(process.cwd(), e7MetaPath),
  });
  timeline.push({ at: new Date().toISOString(), event: "E7 captured (export blocked)" });

  // -------------------------------------------------------------------------
  // E8 — Audit trail
  // -------------------------------------------------------------------------
  console.log("Step 6: audit trail");
  const auditRows = await auditService.listByObject("boq_version", boqVersionId);
  const approveRows = auditRows.filter((r) => r.action_type === "approve");
  const handoffAuditRows = auditRows.filter((r) =>
    String(r.new_value ?? "").includes("Handoff"),
  );

  const e8Path = await writeJson("E8-audit-trail.json", {
    object_type: "boq_version",
    object_id: boqVersionId,
    row_count: auditRows.length,
    rows: auditRows,
    block_evidence_summary: {
      validation_run_rows: auditRows.filter((r) =>
        String(r.new_value ?? "").includes("validation_run"),
      ).length,
      approve_rows: approveRows.length,
      handoff_rows: handoffAuditRows.length,
      note: "Rejected approval/handoff attempts do not produce approve/handoff audit rows (M-03).",
    },
  });

  if (approveRows.length > 0) {
    throw new Error(`E8: no approve audit rows expected when blocked; got ${approveRows.length}`);
  }
  if (auditRows.length < 1) {
    throw new Error("E8: expected at least 1 audit row (validation_run)");
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
  const e9Body = `# SIM-005 Missing Discipline Block — Execution Note (E9) — OFFICIAL

| Field | Value |
|-------|-------|
| Run type | **Official Sprint 7B Phase 3B** |
| Scenario | SIM-005 Missing Discipline Block (discipline-block delta from SIM-001) |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Duration | ${durationMs} ms |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Expected BLOCK rules | ${EXPECTED_BLOCK_RULES.join(", ")} |
| Open BLOCK rules | ${openBlockRules.join(", ")} |
| Unresolved BLOCK count | ${gate.unresolved_block_count} |
| Readiness tier | ${readiness.tier} |
| Approval attempt 1 code | ${approvalAttempt1.code} |
| Approval attempt 2 code | ${approvalAttempt2.code} |
| Handoff block code | ${handoffAttempt.code} |
| Export block code | ${EXPORT_BLOCKED_CODE} |
| Export block count (message) | ${excelBlockCount} |
| Handoff records created | 0 |
| Audit rows captured | ${auditRows.length} |
| BOQ Version ID (E1/E2/E7) | ${boqVersionId} (consistent) |
| requestId / traceId | Not supported — deferred M-07 |

## Timeline

${timeline.map((t) => `- ${t.at} — ${t.event}`).join("\n")}

## Step results

${stepResults
  .map(
    (s) =>
      `- [${s.status}] ${s.step}\n  ${JSON.stringify({ ...s, status: undefined, step: undefined })}`,
  )
  .join("\n")}

## Cross-layer enforcement

- Validation Engine: ${EXPECTED_BLOCK_RULES.join(", ")} persisted; unresolved_block_count=${gate.unresolved_block_count}
- Approval Authority Framework: blocked (${approvalAttempt1.code}); no workflow created; retry remains blocked
- Handoff Framework: blocked (${handoffAttempt.code}); no handoff_records row
- Export gate: EXPORT_BLOCKED 400; no xlsx/pdf artifacts; block count matches E2
- Readiness SSOT: **Blocked**
- Audit Framework: validation_run captured; no false approve/handoff rows

## Idempotency / retry

- Fresh seed namespace (SIM-005-CLIENT / unique BOQ Version ID)
- No SIM-003 ID reuse
- Approval retry blocked (${approvalAttempt2.code})
- Export retry blocked (${EXPORT_BLOCKED_CODE})
- No diagnostic artifact reuse (PRE_GATE_DIAGNOSTIC not cited)

## Operational readiness statement

Official SIM-005 Missing Discipline Block PASS does NOT imply Operational Readiness PASS.
SIM-006 / SIM-007 remain pending.
Operational Readiness PASS = **NOT CLAIMED**.

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

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const reportBody = `# Sprint 7B Phase 3B — SIM-005 Missing Discipline Block (Official Execution Report)

| Field | Value |
|-------|-------|
| Scenario | SIM-005 — Missing Discipline Block (discipline-block profile) |
| Run type | **Official** (post SIM-003 closure + E0 baseline) |
| Result | **PASS** |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Duration | ${durationMs} ms |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Expected BLOCK rules | ${EXPECTED_BLOCK_RULES.join(", ")} |
| Unresolved BLOCK count | ${gate.unresolved_block_count} |
| Readiness tier | ${readiness.tier} |
| Approval outcome | Blocked (${approvalAttempt1.code}) |
| Handoff outcome | Blocked (${handoffAttempt.code}); 0 records |
| Export outcome | Blocked (${EXPORT_BLOCKED_CODE}) |
| Audit rows (official) | ${auditRows.length} |
| Evidence path | docs/SPRINT_7B/evidence/SIM-005/ |
| Final green check | [PHASE3_SIM-005/FINAL_GREEN_CHECK.md](../PHASE3_SIM-005/FINAL_GREEN_CHECK.md) |

## Cross-layer block proof

When unresolved BLOCK exists, all forward frameworks stop:

| Layer | Expected | Observed |
|-------|----------|----------|
| Validation (E2) | BLOCK rules + can_approve=false | **PASS** |
| Readiness (E6) | Blocked | **PASS** |
| Approval (E4) | 403 blocked; no workflow | **PASS** |
| Handoff (E5) | blocked; no record | **PASS** |
| Export (E7) | 400 EXPORT_BLOCKED; no files | **PASS** |
| Audit (E8) | validation captured; no false approve | **PASS** |

## Evidence index (E1–E9)

| ID | Artifact |
|----|----------|
| E1 | [E1-seed-payload.json](../evidence/SIM-005/E1-seed-payload.json) |
| E2 | [E2-validation-snapshot.json](../evidence/SIM-005/E2-validation-snapshot.json) |
| E3 | [E3-workflow-state.json](../evidence/SIM-005/E3-workflow-state.json) |
| E4 | [E4-approval-gates.json](../evidence/SIM-005/E4-approval-gates.json) |
| E5 | [E5-handoff-record.json](../evidence/SIM-005/E5-handoff-record.json) |
| E6 | [E6-readiness-status.json](../evidence/SIM-005/E6-readiness-status.json) |
| E7 | [E7-export-result/](../evidence/SIM-005/E7-export-result/) |
| E8 | [E8-audit-trail.json](../evidence/SIM-005/E8-audit-trail.json) |
| E9 | [E9-execution-note.md](../evidence/SIM-005/E9-execution-note.md) |

## Governance

- SIM-003 PASS / CLOSED before execution
- E0 baseline PASS before official run
- Pre-gate diagnostic artifacts not used as evidence
- Does NOT claim Operational Readiness PASS (SIM-006/007 pending)

End of SIM-005 official execution report.
`;
  await writeFile(REPORT_PATH, reportBody, "utf8");
  recordStep("EXECUTION_REPORT: SIM-005.md written", "PASS", {
    file: path.relative(process.cwd(), REPORT_PATH),
  });

  console.log(`\nSIM-005 OFFICIAL PASS — evidence at ${path.relative(process.cwd(), EVIDENCE_DIR)}`);
  console.log(
    JSON.stringify(
      {
        scenario: "SIM-005",
        result: "PASS",
        durationMs,
        readinessTier: readiness.tier,
        unresolvedBlockCount: gate.unresolved_block_count,
        approvalBlockCode: approvalAttempt1.code,
        exportBlockCode: EXPORT_BLOCKED_CODE,
        evidence: stepResults.map((s) => ({ step: s.step, status: s.status })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (err) => {
    console.error("\nSIM-005 FAIL — STOP ON FAIL");
    console.error(err);
    try {
      await mkdir(EVIDENCE_DIR, { recursive: true });
      await writeFile(
        path.join(EVIDENCE_DIR, "E9-execution-note.md"),
        `# SIM-005 Missing Discipline Block — FAIL (STOP ON FAIL)

| Field | Value |
|-------|-------|
| Result | **BLOCKED** |
| Error | ${err && err.message ? err.message : String(err)} |

## Defect summary

Execution halted per Stop-on-Fail rule. Do not proceed to SIM-006/007 until resolved.

\`\`\`
${err && err.stack ? err.stack : ""}
\`\`\`
`,
        "utf8",
      );
      await mkdir(path.resolve("docs/SPRINT_7B/PHASE3_SIM-005"), { recursive: true });
      await writeFile(
        path.resolve("docs/SPRINT_7B/PHASE3_SIM-005/FINAL_GREEN_CHECK.md"),
        `# SIM-005 — Final Green Check — **BLOCKED**

Execution failed. See E9 execution note and defect summary above.

**Recommendation: BLOCKED**
`,
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
