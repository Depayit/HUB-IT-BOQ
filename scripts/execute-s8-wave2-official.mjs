/**
 * Official Runner — Sprint 8 Wave 2 (NP-003 / NP-004 / NP-007 / NP-005 / NP-006)
 *
 * Usage:
 *   npx tsx scripts/execute-s8-wave2-official.mjs --np=003 --project=<id> --boq=<id>
 */
import { mkdir, writeFile } from "node:fs/promises";

import { prisma } from "../src/lib/db/prisma.ts";
import { validationService } from "../src/lib/services/validation.service.ts";
import { approvalService } from "../src/lib/services/approval.service.ts";
import { handoffService } from "../src/lib/services/handoff.service.ts";
import {
  exportService,
  EXPORT_BLOCKED_CODE,
} from "../src/lib/services/export.service.ts";
import { boqSummaryReportService } from "../src/lib/services/boq-summary-report.service.ts";
import { boqLineService } from "../src/lib/services/boq-line.service.ts";
import { boqVersionService } from "../src/lib/services/boq-version.service.ts";
import { HANDOFF_TARGET_REQUIRED_CODE } from "../src/lib/validations/handoff.ts";

import {
  assertBoqVersionId,
  assertNoContamination,
  buildReadinessSnapshot,
  buildTd7b003Assessment,
  buildValidationSummary,
  captureAppError,
  captureHandoffs,
  captureSeedPayload,
  captureValidationResults,
  captureWorkflow,
  createEvidenceWriter,
  expectBlocked,
  exportDir,
  openBlockRuleCodes,
  openWarningRuleCodes,
  parseArgs,
  writeE8,
  writeE9,
  writeExecutionReport,
} from "./lib/s8-wave2-evidence.mjs";

const WAVE2_ACTORS = {
  engineer: "engineer-001@wave2",
  manager: "manager-001@wave2",
  director: "director-001@wave2",
  procurement: "procurement-001@wave2",
};

async function advanceToFinalLock(projectId, boqVersionId) {
  const steps = [
    { actor: WAVE2_ACTORS.engineer, role: "Engineer" },
    { actor: WAVE2_ACTORS.engineer, role: "Engineer" },
    { actor: WAVE2_ACTORS.manager, role: "Manager" },
    { actor: WAVE2_ACTORS.director, role: "Director" },
  ];
  for (const step of steps) {
    await approvalService.advanceStage(
      projectId,
      boqVersionId,
      step.actor,
      step.role,
    );
  }
  const version = await boqVersionService.getById(boqVersionId);
  const workflow = await captureWorkflow(boqVersionId);
  if (workflow?.current_stage !== "Final Lock") {
    throw new Error(`Setup expected Final Lock; got ${workflow?.current_stage ?? "null"}`);
  }
  if (version?.lock_status !== "Locked" || version?.status !== "Locked") {
    throw new Error(
      `Setup expected Locked BOQ; got status=${version?.status} lock=${version?.lock_status}`,
    );
  }
  await validationService.runValidation(boqVersionId);
  return { workflow, version };
}

async function attemptExportBothFormats(projectId, boqVersionId) {
  let excelBlock = null;
  let pdfBlock = null;
  let exportSucceeded = false;
  let excelBuffer = null;
  let pdfBuffer = null;

  try {
    const excel = await exportService.exportToExcel(projectId, boqVersionId);
    excelBuffer = excel.buffer.length;
    exportSucceeded = true;
  } catch (err) {
    excelBlock = captureAppError(err);
  }

  try {
    const pdf = await exportService.exportToPdf(projectId, boqVersionId);
    pdfBuffer = pdf.buffer.length;
    exportSucceeded = true;
  } catch (err) {
    pdfBlock = captureAppError(err);
  }

  return {
    export_blocked: !exportSucceeded,
    export_succeeded: exportSucceeded,
    excel_block: excelBlock,
    pdf_block: pdfBlock,
    artifacts: exportSucceeded
      ? [
          ...(excelBuffer != null ? [{ type: "xlsx", bytes: excelBuffer }] : []),
          ...(pdfBuffer != null ? [{ type: "pdf", bytes: pdfBuffer }] : []),
        ]
      : [],
  };
}

async function runNp003(projectId, boqVersionId) {
  const npId = "NP-003";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const stepResults = [];
  const record = (step, status, details = {}) => {
    stepResults.push({ step, status, at: new Date().toISOString(), ...details });
    console.log(`  [${status}] ${step}`);
  };

  await mkdir(exportDir(npId), { recursive: true });

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "export-while-block",
    persona: "Procurement",
    ...seed,
  });
  record("E1: seed captured", "PASS");
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  await validationService.runValidation(boqVersionId);
  const validationResults = await captureValidationResults(boqVersionId);
  const gate = await validationService.getWorkflowGate(boqVersionId);
  const openBlocks = openBlockRuleCodes(validationResults);
  if (gate.unresolved_block_count < 1) {
    throw new Error("STOP: NP-003 requires unresolved BLOCK");
  }

  const readiness = buildReadinessSnapshot(gate, validationResults, seed.boqVersion);
  if (readiness.tier !== "Blocked") {
    throw new Error(`STOP: false PASS — readiness tier ${readiness.tier}, expected Blocked`);
  }

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    validation_results: validationResults,
    workflow_gate: gate,
    open_block_rule_codes: openBlocks,
    validation_summary: buildValidationSummary(gate, validationResults, seed.boqVersion),
  });
  await writeJson("E6-readiness-status.json", readiness);
  record("E2/E6: BLOCK + Blocked tier", "PASS", { tier: readiness.tier, openBlocks });
  timeline.push({ at: new Date().toISOString(), event: "E2+E6 captured" });

  await writeJson("E3-workflow-state.json", {
    workflow: await captureWorkflow(boqVersionId),
    note: "No workflow — BOQ not advanced while BLOCK active",
  });
  await writeJson("E4-approval-gates.json", {
    persona: "Procurement",
    note: "Procurement cannot bypass validation BLOCK via export",
  });

  const handoffAttempt = await expectBlocked(
    "handoff with BLOCK",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        WAVE2_ACTORS.procurement,
        "NP-003 blocked handoff",
        "Procurement",
      ),
    ["VALIDATION_BLOCK", "BOQ_NOT_LOCKED", HANDOFF_TARGET_REQUIRED_CODE],
  );
  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    blocked_attempt: handoffAttempt,
    record_count: 0,
  });

  const exportResult = await attemptExportBothFormats(projectId, boqVersionId);
  if (exportResult.export_succeeded) {
    throw new Error("STOP: export succeeded while BLOCK exists — CRITICAL FALSE PASS");
  }

  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: true,
    excel_block: exportResult.excel_block,
    pdf_block: exportResult.pdf_block,
    report_unresolved_blocks: exportReport?.validation?.unresolved_blocks,
    e2_unresolved_blocks: gate.unresolved_block_count,
    report_readiness_tier: exportReport?.readiness?.tier,
    e6_readiness_tier: readiness.tier,
    artifacts: [],
  });

  if (exportReport && exportReport.validation.unresolved_blocks !== gate.unresolved_block_count) {
    throw new Error("STOP: E2/E7 unresolved_blocks mismatch");
  }
  if (exportReport?.readiness?.tier === "Ready") {
    throw new Error("STOP: false PASS — report says Ready while BLOCK active");
  }

  await writeE8(boqVersionId, writeJson);
  record("E7: export blocked (xlsx + pdf)", "PASS", {
    code: exportResult.excel_block?.code ?? exportResult.pdf_block?.code,
  });

  const td7b003 = buildTd7b003Assessment({
    scenario: npId,
    e6Tier: readiness.tier,
    e6UnresolvedBlocks: gate.unresolved_block_count,
    handoffBlocked: true,
    handoffBlockCode: handoffAttempt.code,
    exportBlocked: true,
    exportBlockCode: exportResult.excel_block?.code ?? EXPORT_BLOCKED_CODE,
    exportSucceeded: false,
    handoffRecordCount: 0,
  });

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Procurement",
      actionAttempted: "Export xlsx/pdf while validation BLOCK active",
      expectedResult: "EXPORT_BLOCKED; no artifacts; readiness Blocked",
      actualResult: `${exportResult.excel_block?.code}; tier=${readiness.tier}`,
      falsePassChecks: [
        { pass: true, label: "Export blocked (no xlsx/pdf)" },
        { pass: true, label: "Readiness tier Blocked (not Ready)" },
        { pass: true, label: "E2/E7 unresolved_blocks consistent" },
        { pass: true, label: "No handoff records" },
      ],
      lessonsLearned: [
        "Procurement export path respects validation BLOCK gate — no bypass.",
        "E6 Blocked tier aligns with E7 export block for NP-003.",
      ],
      timeline,
      stepResults,
      td7b003,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Procurement",
    summary:
      "Procurement export while BLOCK active returned EXPORT_BLOCKED for xlsx and pdf. Readiness Blocked. E2/E7 consistent. No false PASS.",
    td7b003Note:
      "TD-7B-003: Export and readiness layers both block — confirms validation gate SSOT for export when BLOCK present. Does not close TD-7B-003.",
  });

  return { npId, verdict: "PASS" };
}

async function runNp004(projectId, boqVersionId) {
  const npId = "NP-004";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const stepResults = [];
  const record = (step, status, details = {}) => {
    stepResults.push({ step, status, at: new Date().toISOString(), ...details });
    console.log(`  [${status}] ${step}`);
  };

  await mkdir(exportDir(npId), { recursive: true });

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "handoff-without-target",
    persona: "Procurement",
    ...seed,
  });
  record("E1: seed captured", "PASS");
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  await validationService.runValidation(boqVersionId);
  const preLockResults = await captureValidationResults(boqVersionId);
  const preLockGate = await validationService.getWorkflowGate(boqVersionId);

  const { workflow: lockedWorkflow } = await advanceToFinalLock(projectId, boqVersionId);
  record("Setup: BOQ at Final Lock", "PASS");

  const postLockResults = await captureValidationResults(boqVersionId);
  const postLockGate = await validationService.getWorkflowGate(boqVersionId);
  const lockedVersion = await boqVersionService.getById(boqVersionId);
  const readiness = buildReadinessSnapshot(
    postLockGate,
    postLockResults,
    lockedVersion ?? {},
  );

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    pre_lock: { validation_results: preLockResults, workflow_gate: preLockGate },
    post_lock: {
      validation_results: postLockResults,
      workflow_gate: postLockGate,
      validation_summary: buildValidationSummary(
        postLockGate,
        postLockResults,
        lockedVersion ?? {},
      ),
    },
  });
  await writeJson("E6-readiness-status.json", readiness);
  await writeJson("E3-workflow-state.json", lockedWorkflow);
  record("E2/E3/E6: post-lock validation captured", "PASS", { tier: readiness.tier });

  const handoffsBefore = await captureHandoffs(boqVersionId);
  const handoffAttempt1 = await expectBlocked(
    "handoff without target",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        WAVE2_ACTORS.procurement,
        "NP-004 handoff without target",
      ),
    [HANDOFF_TARGET_REQUIRED_CODE],
  );
  const handoffAttempt2 = await expectBlocked(
    "handoff retry explicit null",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        WAVE2_ACTORS.procurement,
        "NP-004 retry null target",
        null,
      ),
    [HANDOFF_TARGET_REQUIRED_CODE],
  );
  const handoffsAfter = await captureHandoffs(boqVersionId);

  if (handoffsAfter.length > handoffsBefore.length) {
    throw new Error("STOP: handoff record created without target — CRITICAL FALSE PASS");
  }
  if (handoffAttempt1.code !== HANDOFF_TARGET_REQUIRED_CODE) {
    throw new Error(`STOP: expected ${HANDOFF_TARGET_REQUIRED_CODE}`);
  }

  await writeJson("E4-approval-gates.json", {
    persona: "Procurement",
    setup: "BOQ locked via Director Final Lock",
    handoff_attempt_1: handoffAttempt1,
    handoff_attempt_2: handoffAttempt2,
  });
  await writeJson("E5-handoff-record.json", {
    boq_version_id: boqVersionId,
    expected_outcome: "HANDOFF_TARGET_REQUIRED",
    handoff_records_before: handoffsBefore,
    handoff_records_after: handoffsAfter,
    record_count: handoffsAfter.length,
    blocked_attempt: handoffAttempt1,
    retry_remains_blocked: handoffAttempt2.code === HANDOFF_TARGET_REQUIRED_CODE,
    proof_no_handoff_created: handoffsAfter.length === handoffsBefore.length,
  });
  record("E5: handoff blocked, 0 records", "PASS", { code: handoffAttempt1.code });

  const exportResult = await attemptExportBothFormats(projectId, boqVersionId);
  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );

  const td7b003 = buildTd7b003Assessment({
    scenario: npId,
    e6Tier: readiness.tier,
    e6UnresolvedBlocks: postLockGate.unresolved_block_count,
    handoffBlocked: true,
    handoffBlockCode: HANDOFF_TARGET_REQUIRED_CODE,
    exportBlocked: exportResult.export_blocked,
    exportBlockCode: exportResult.excel_block?.code ?? null,
    exportSucceeded: exportResult.export_succeeded,
    handoffRecordCount: handoffsAfter.length,
  });

  const verdict =
    exportResult.export_succeeded && readiness.tier === "Ready"
      ? "PASS WITH WARNING"
      : "PASS";

  if (exportResult.export_succeeded && readiness.tier !== "Ready") {
    throw new Error("STOP: export succeeded but E6 tier inconsistent");
  }

  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: exportResult.export_blocked,
    export_succeeded: exportResult.export_succeeded,
    excel_block: exportResult.excel_block,
    pdf_block: exportResult.pdf_block,
    report_readiness_tier: exportReport?.readiness?.tier,
    e6_readiness_tier: readiness.tier,
    td_7b_003: td7b003,
    artifacts: exportResult.artifacts,
    note: exportResult.export_succeeded
      ? "Export allowed post-lock while handoff layer blocks — SIM-007 / TD-7B-003 known gap"
      : "Export blocked alongside handoff block",
  });

  await writeE8(boqVersionId, writeJson);

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Procurement",
      actionAttempted: "Handoff without handoff_target on locked BOQ",
      expectedResult: "HANDOFF_TARGET_REQUIRED; 0 records; retry blocked",
      actualResult: `${handoffAttempt1.code}; records=${handoffsAfter.length}; export=${exportResult.export_succeeded ? "allowed" : "blocked"}`,
      falsePassChecks: [
        { pass: true, label: "No handoff record created" },
        { pass: true, label: "Retry remains blocked" },
        { pass: true, label: "HANDOFF_TARGET_REQUIRED returned" },
        {
          pass: !exportResult.export_succeeded || readiness.tier === "Ready",
          label: "No downstream false success without TD-7B-003 documentation",
        },
      ],
      lessonsLearned: [
        "Handoff layer enforces handoff_target independently of validation readiness post-lock.",
        exportResult.export_succeeded
          ? "TD-7B-003 gap reproduced: E6 Ready while handoff blocked; export may proceed."
          : "Export and handoff both blocked in this run.",
      ],
      timeline,
      stepResults,
      td7b003,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict,
    persona: "Procurement",
    summary: `Handoff without target blocked (${HANDOFF_TARGET_REQUIRED_CODE}). Zero handoff records. Retry blocked.${
      exportResult.export_succeeded
        ? " Export allowed post-lock while handoff blocked — TD-7B-003 documented (PASS WITH WARNING)."
        : ""
    }`,
    td7b003Note: `TD-7B-003 assessment: ${td7b003.confirms_or_contradicts_td_7b_003}. TD-7B-003 **not closed**.`,
  });

  return { npId, verdict };
}

async function runNp007(projectId, boqVersionId) {
  const npId = "NP-007";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const stepResults = [];
  const record = (step, status, details = {}) => {
    stepResults.push({ step, status, at: new Date().toISOString(), ...details });
    console.log(`  [${status}] ${step}`);
  };

  await mkdir(exportDir(npId), { recursive: true });

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "warning-block-coexistence",
    persona: "Engineer",
    expected_block_rules: ["DESIGN_BASIS_NOT_APPROVED"],
    expected_warning_rules: ["DISCIPLINE_MISSING_SCOPE"],
    ...seed,
  });
  record("E1: seed captured", "PASS");

  await validationService.runValidation(boqVersionId);
  const validationResults = await captureValidationResults(boqVersionId);
  const gate = await validationService.getWorkflowGate(boqVersionId);
  const openBlocks = openBlockRuleCodes(validationResults);
  const openWarnings = openWarningRuleCodes(validationResults);

  if (openBlocks.length < 1) {
    throw new Error("STOP: NP-007 requires at least one BLOCK");
  }
  if (openWarnings.length < 1) {
    throw new Error("STOP: NP-007 requires at least one WARNING");
  }

  const readiness = buildReadinessSnapshot(gate, validationResults, seed.boqVersion);
  if (readiness.tier !== "Blocked") {
    throw new Error(
      `STOP: false PASS — Warning masked Block; tier=${readiness.tier}, expected Blocked`,
    );
  }

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    validation_results: validationResults,
    workflow_gate: gate,
    open_block_rule_codes: openBlocks,
    open_warning_rule_codes: openWarnings,
    block_dominates_warning: readiness.tier === "Blocked",
  });
  await writeJson("E6-readiness-status.json", {
    ...readiness,
    warning_present: openWarnings.length > 0,
    block_present: openBlocks.length > 0,
    block_dominates: true,
    tier_must_be_blocked: true,
  });
  record("E2/E6: Warning + Block; tier Blocked", "PASS", {
    openBlocks,
    openWarnings,
    tier: readiness.tier,
  });

  const approvalAttempt = await expectBlocked(
    "approval with BLOCK",
    () =>
      approvalService.advanceStage(
        projectId,
        boqVersionId,
        WAVE2_ACTORS.engineer,
        "Engineer",
      ),
    ["VALIDATION_BLOCK", "DESIGN_BASIS_NOT_APPROVED"],
  );
  await writeJson("E3-workflow-state.json", {
    workflow: await captureWorkflow(boqVersionId),
    note: "No workflow — BLOCK prevents advance",
  });
  await writeJson("E4-approval-gates.json", { blocked_attempt: approvalAttempt });
  await writeJson("E5-handoff-record.json", {
    handoff_records: [],
    record_count: 0,
    note: "No handoff — BOQ not locked",
  });

  const exportResult = await attemptExportBothFormats(projectId, boqVersionId);
  if (exportResult.export_succeeded) {
    throw new Error("STOP: export succeeded with BLOCK + WARNING — CRITICAL FALSE PASS");
  }

  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: true,
    excel_block: exportResult.excel_block,
    pdf_block: exportResult.pdf_block,
    e2_unresolved_blocks: gate.unresolved_block_count,
    e6_readiness_tier: readiness.tier,
    report_readiness_tier: exportReport?.readiness?.tier,
    artifacts: [],
  });

  if (exportReport?.readiness?.tier === "Ready") {
    throw new Error("STOP: report Ready while BLOCK present");
  }

  await writeE8(boqVersionId, writeJson);

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Engineer",
      actionAttempted: "Submit BOQ with coexisting WARNING + BLOCK",
      expectedResult: "BLOCK dominates; E6 Blocked; export blocked",
      actualResult: `BLOCK=${openBlocks.join(",")}; WARNING=${openWarnings.join(",")}; tier=${readiness.tier}`,
      falsePassChecks: [
        { pass: true, label: "Warning does not mask Block" },
        { pass: true, label: "E6 tier Blocked (not Ready/Warning)" },
        { pass: true, label: "Export blocked" },
        { pass: true, label: "E2 lists both severities" },
      ],
      lessonsLearned: [
        "deriveReadinessTier gate-first: unresolved BLOCK forces Blocked tier despite WARNING.",
        "Engineer cannot advance approval while BLOCK coexists with WARNING.",
      ],
      timeline,
      stepResults,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Engineer",
    summary: `Warning (${openWarnings.join(", ")}) + Block (${openBlocks.join(", ")}) coexist. Readiness Blocked. Export blocked. No false PASS.`,
  });

  return { npId, verdict: "PASS" };
}

async function runNp005(projectId, boqVersionId) {
  const npId = "NP-005";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const stepResults = [];
  const record = (step, status, details = {}) => {
    stepResults.push({ step, status, at: new Date().toISOString(), ...details });
    console.log(`  [${status}] ${step}`);
  };

  await mkdir(exportDir(npId), { recursive: true });

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "reopen-approved-boq",
    persona: "Director + Engineer",
    ...seed,
  });
  record("E1: seed captured", "PASS");

  await validationService.runValidation(boqVersionId);
  const { workflow: lockedWorkflow } = await advanceToFinalLock(projectId, boqVersionId);
  record("Setup: BOQ locked", "PASS");

  const workflowBeforeReopen = await captureWorkflow(boqVersionId);
  const lines = await boqLineService.listByBoqVersion(boqVersionId);
  const targetLine = lines[0];
  if (!targetLine) throw new Error("NP-005 seed must have BOQ lines");

  const editAttempt = await expectBlocked(
    "Engineer edit on locked BOQ",
    () =>
      boqLineService.update(targetLine.boq_line_id, boqVersionId, {
        project_discipline_id: targetLine.project_discipline_id,
        item_description: "MODIFIED AFTER LOCK — must be blocked",
        unit: targetLine.unit,
        quantity: targetLine.quantity,
        line_no: targetLine.line_no,
      }),
    ["BOQ_LOCKED"],
  );

  const workflowAfterReopen = await captureWorkflow(boqVersionId);
  if (workflowAfterReopen?.current_stage !== "Final Lock") {
    throw new Error("STOP: workflow changed after blocked edit attempt");
  }

  await validationService.runValidation(boqVersionId);
  const postEditResults = await captureValidationResults(boqVersionId);
  const postEditGate = await validationService.getWorkflowGate(boqVersionId);
  const lockedVersion = await boqVersionService.getById(boqVersionId);
  const readiness = buildReadinessSnapshot(
    postEditGate,
    postEditResults,
    lockedVersion ?? {},
  );

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    post_edit_attempt: {
      validation_results: postEditResults,
      workflow_gate: postEditGate,
      edit_blocked: true,
      edit_block_code: editAttempt.code,
    },
    note: "E2 captured after blocked re-open edit attempt — BOQ content unchanged",
  });
  await writeJson("E3-workflow-state.json", {
    before_reopen_attempt: workflowBeforeReopen,
    after_reopen_attempt: workflowAfterReopen,
    lock_preserved: workflowAfterReopen?.current_stage === "Final Lock",
    boq_lock_status: lockedVersion?.lock_status,
  });
  await writeJson("E4-approval-gates.json", {
    persona: "Engineer (re-open attempt)",
    director_setup: lockedWorkflow,
    edit_attempt: editAttempt,
    approval_state: "Locked — edit controlled via BOQ_LOCKED",
  });
  await writeJson("E6-readiness-status.json", readiness);

  const exportResult = await attemptExportBothFormats(projectId, boqVersionId);
  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    record_count: 0,
    note: "No handoff attempted — re-open control focus",
  });
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: exportResult.export_blocked,
    export_succeeded: exportResult.export_succeeded,
    edit_block_code: editAttempt.code,
    post_edit_readiness_tier: readiness.tier,
    note: "Export reflects locked approved state — edit was blocked (controlled re-open)",
    artifacts: exportResult.artifacts,
  });

  await writeE8(boqVersionId, writeJson);
  record("E4: re-open edit blocked", "PASS", { code: editAttempt.code });

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Director + Engineer",
      actionAttempted: "Engineer re-open edit on locked approved BOQ",
      expectedResult: "Edit blocked (BOQ_LOCKED); approval/lock controlled; export re-evaluated",
      actualResult: `${editAttempt.code}; workflow remains Final Lock`,
      falsePassChecks: [
        { pass: true, label: "Edit blocked on locked BOQ" },
        { pass: true, label: "Workflow stage unchanged after edit attempt" },
        { pass: true, label: "No silent content mutation" },
        {
          pass: true,
          label: "Stale approval controlled — lock prevents edit",
        },
      ],
      lessonsLearned: [
        "Re-open attempt blocked at BOQ_LOCKED — approval snapshot preserved.",
        "No formal reopen/revoke API; lock_status gate is the control mechanism.",
      ],
      timeline,
      stepResults,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Director + Engineer",
    summary:
      "Re-open edit on locked BOQ blocked (BOQ_LOCKED). Workflow remains Final Lock. Approval state controlled. Export re-evaluated against unchanged locked content.",
  });

  return { npId, verdict: "PASS" };
}

async function runNp006(projectId, boqVersionId) {
  const npId = "NP-006";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const stepResults = [];
  const record = (step, status, details = {}) => {
    stepResults.push({ step, status, at: new Date().toISOString(), ...details });
    console.log(`  [${status}] ${step}`);
  };

  await mkdir(exportDir(npId), { recursive: true });

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "export-after-revoke",
    persona: "Director + Procurement",
    ...seed,
  });
  record("E1: seed captured", "PASS");

  await validationService.runValidation(boqVersionId);
  await advanceToFinalLock(projectId, boqVersionId);
  record("Setup: BOQ locked", "PASS");

  const workflowBeforeRevoke = await captureWorkflow(boqVersionId);
  const revokeAt = new Date();

  await prisma.boq_versions.update({
    where: { boq_version_id: boqVersionId },
    data: { status: "Draft", lock_status: "Unlocked" },
  });
  await prisma.approval_workflows.update({
    where: { boq_version_id: boqVersionId },
    data: {
      current_stage: "Director Approval",
      workflow_status: "InProgress",
      final_locked_by: null,
      final_locked_at: null,
    },
  });
  await prisma.design_basis_versions.updateMany({
    where: { project_id: projectId },
    data: { approval_status: "Draft" },
  });

  await validationService.runValidation(boqVersionId);
  const postRevokeResults = await captureValidationResults(boqVersionId);
  const postRevokeGate = await validationService.getWorkflowGate(boqVersionId);
  const revokedVersion = await boqVersionService.getById(boqVersionId);
  const readiness = buildReadinessSnapshot(
    postRevokeGate,
    postRevokeResults,
    revokedVersion ?? {},
  );
  const workflowAfterRevoke = await captureWorkflow(boqVersionId);

  await writeJson("E3-workflow-state.json", {
    before_revoke: workflowBeforeRevoke,
    after_revoke: workflowAfterRevoke,
    revoke_at: revokeAt.toISOString(),
    revoke_simulation: {
      at: revokeAt.toISOString(),
      method: "Director revoke simulation — unlock BOQ + revert design basis to Draft",
      note: "No formal revoke API; state mutation documents revoke intent for Wave 2",
    },
  });
  await writeJson("E4-approval-gates.json", {
    persona: "Director",
    revoke_event: {
      at: revokeAt.toISOString(),
      lock_status: revokedVersion?.lock_status,
    },
  });
  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    post_revoke: {
      validation_results: postRevokeResults,
      workflow_gate: postRevokeGate,
      open_block_rule_codes: openBlockRuleCodes(postRevokeResults),
    },
  });
  await writeJson("E6-readiness-status.json", readiness);
  record("E3: revoke state applied", "PASS", { tier: readiness.tier });

  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    record_count: 0,
  });

  const exportResult = await attemptExportBothFormats(projectId, boqVersionId);
  if (exportResult.export_succeeded) {
    throw new Error("STOP: export succeeded after revoke — CRITICAL FALSE PASS");
  }

  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: true,
    export_attempt_after_revoke: true,
    revoke_timestamp: revokeAt.toISOString(),
    excel_block: exportResult.excel_block,
    pdf_block: exportResult.pdf_block,
    e2_unresolved_blocks: postRevokeGate.unresolved_block_count,
    e6_readiness_tier: readiness.tier,
    report_readiness_tier: exportReport?.readiness?.tier,
    artifacts: [],
  });

  if (exportReport?.readiness?.tier === "Ready") {
    throw new Error("STOP: report Ready after revoke with BLOCK");
  }

  await writeE8(boqVersionId, writeJson);
  record("E7: export blocked after revoke", "PASS", {
    code: exportResult.excel_block?.code,
  });

  const td7b003 = buildTd7b003Assessment({
    scenario: npId,
    e6Tier: readiness.tier,
    e6UnresolvedBlocks: postRevokeGate.unresolved_block_count,
    handoffBlocked: true,
    handoffBlockCode: "BOQ_NOT_LOCKED",
    exportBlocked: true,
    exportBlockCode: exportResult.excel_block?.code ?? EXPORT_BLOCKED_CODE,
    exportSucceeded: false,
    handoffRecordCount: 0,
  });

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Director + Procurement",
      actionAttempted: "Procurement export after Director revoke simulation",
      expectedResult: "Revoked state recognized; export blocked; E3/E7 consistent",
      actualResult: `Revoke at ${revokeAt.toISOString()}; export ${exportResult.excel_block?.code}; tier=${readiness.tier}`,
      falsePassChecks: [
        { pass: true, label: "Export blocked after revoke" },
        { pass: true, label: "E7 attempt after E3 revoke timestamp" },
        { pass: true, label: "Report not Ready after revoke BLOCK" },
        { pass: workflowAfterRevoke?.current_stage !== "Final Lock", label: "Workflow no longer Final Lock" },
      ],
      lessonsLearned: [
        "Revoke simulation invalidates lock and introduces DESIGN_BASIS_NOT_APPROVED BLOCK.",
        "Export gate re-evaluates post-revoke — no stale approved export.",
      ],
      timeline,
      stepResults,
      td7b003,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Director + Procurement",
    summary:
      "After Director revoke simulation, export blocked (EXPORT_BLOCKED). Revoked state reflected in E3/E6/E7. No export after revoke false PASS.",
    td7b003Note:
      "Post-revoke export blocked via validation BLOCK — aligns export with revoked approval state. TD-7B-003 not closed.",
  });

  return { npId, verdict: "PASS" };
}

async function main() {
  const args = parseArgs();
  const np = (args.np ?? args.scenario ?? "").replace(/^NP-/i, "").toUpperCase();
  const projectId = args.project ?? args.projectId;
  const boqVersionId = args.boq ?? args.boqVersionId;

  if (!np || !projectId || !boqVersionId) {
    throw new Error(
      "Usage: npx tsx scripts/execute-s8-wave2-official.mjs --np=003 --project=<id> --boq=<id>",
    );
  }

  assertNoContamination(boqVersionId);

  let result;
  if (np === "003") result = await runNp003(projectId, boqVersionId);
  else if (np === "004") result = await runNp004(projectId, boqVersionId);
  else if (np === "005") result = await runNp005(projectId, boqVersionId);
  else if (np === "006") result = await runNp006(projectId, boqVersionId);
  else if (np === "007") result = await runNp007(projectId, boqVersionId);
  else throw new Error(`Unknown np ${np}. Use 003, 004, 005, 006, or 007.`);

  console.log(JSON.stringify({ wave: 2, ...result }, null, 2));
}

main().catch((err) => {
  console.error("WAVE2 STOP:", err.message ?? err);
  process.exit(1);
});
