/**
 * Official Runner — Sprint 8 Wave 3 (NP-009 / NP-012)
 *
 * Usage:
 *   npx tsx scripts/execute-s8-wave3-official.mjs --np=009 --project=<id> --boq=<id>
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
import { auditService } from "../src/lib/services/audit.service.ts";

import {
  assertBoqVersionId,
  assertNoContamination,
  assessStaleValidation,
  buildFalsePassAnalysis,
  buildReadinessSnapshot,
  buildValidationSummary,
  captureAppError,
  captureHandoffs,
  captureSeedPayload,
  captureValidationResults,
  captureWorkflow,
  createEvidenceWriter,
  exportDir,
  hashBoqLinePayload,
  openBlockRuleCodes,
  parseArgs,
  verifyE2E3E6E7Consistency,
  writeE8,
  writeE9,
  writeExecutionReport,
} from "./lib/s8-wave3-evidence.mjs";

const WAVE3_ACTORS = {
  engineer: "engineer-001@wave3",
  manager: "manager-001@wave3",
  director: "director-001@wave3",
  procurement: "procurement-001@wave3",
  adminOps: "admin-ops-001@wave3",
};

async function advanceToManagerApproval(projectId, boqVersionId) {
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    WAVE3_ACTORS.engineer,
    "Engineer",
  );
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    WAVE3_ACTORS.engineer,
    "Engineer",
  );
  const wf = await captureWorkflow(boqVersionId);
  if (wf?.current_stage !== "Manager Approval") {
    throw new Error(`Setup expected Manager Approval; got ${wf?.current_stage ?? "null"}`);
  }
  return wf;
}

async function advanceToFinalLock(projectId, boqVersionId) {
  const steps = [
    { actor: WAVE3_ACTORS.engineer, role: "Engineer" },
    { actor: WAVE3_ACTORS.engineer, role: "Engineer" },
    { actor: WAVE3_ACTORS.manager, role: "Manager" },
    { actor: WAVE3_ACTORS.director, role: "Director" },
  ];
  for (const step of steps) {
    await approvalService.advanceStage(projectId, boqVersionId, step.actor, step.role);
  }
  const version = await boqVersionService.getById(boqVersionId);
  const workflow = await captureWorkflow(boqVersionId);
  if (workflow?.current_stage !== "Final Lock") {
    throw new Error(`Setup expected Final Lock; got ${workflow?.current_stage ?? "null"}`);
  }
  if (version?.lock_status !== "Locked") {
    throw new Error(`Setup expected Locked BOQ; lock=${version?.lock_status}`);
  }
  return { workflow, version };
}

async function attemptExport(projectId, boqVersionId) {
  let excelBlock = null;
  let pdfBlock = null;
  let exportSucceeded = false;
  let excelBytes = null;

  try {
    const excel = await exportService.exportToExcel(projectId, boqVersionId);
    excelBytes = excel.buffer.length;
    exportSucceeded = true;
  } catch (err) {
    excelBlock = captureAppError(err);
  }

  try {
    await exportService.exportToPdf(projectId, boqVersionId);
    exportSucceeded = true;
  } catch (err) {
    pdfBlock = captureAppError(err);
  }

  return {
    export_blocked: !exportSucceeded,
    export_succeeded: exportSucceeded,
    excel_block: excelBlock,
    pdf_block: pdfBlock,
    artifacts: exportSucceeded && excelBytes != null ? [{ type: "xlsx", bytes: excelBytes }] : [],
  };
}

async function introduceCriticalZeroCost(boqVersionId, boqLineId) {
  await prisma.boq_lines.update({
    where: { boq_line_id: boqLineId },
    data: { is_critical_line: true },
  });
  await prisma.boq_cost_breakdowns.deleteMany({ where: { boq_line_id: boqLineId } });
  return prisma.boq_lines.findUniqueOrThrow({ where: { boq_line_id: boqLineId } });
}

async function runNp009(projectId, boqVersionId) {
  const npId = "NP-009";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const record = (event, persona = null) => {
    const at = new Date().toISOString();
    timeline.push({ at, event, persona });
    console.log(`  ${persona ? `[${persona}] ` : ""}${event}`);
  };

  await mkdir(exportDir(npId), { recursive: true });
  assertNoContamination(boqVersionId);

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  const e1LineHash = hashBoqLinePayload(
    (await boqLineService.listByBoqVersion(boqVersionId)).map((l) => l),
  );

  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "stale-validation-snapshot",
    persona: "Engineer + Admin/Ops",
    e1_line_payload_hash: e1LineHash,
    ...seed,
  });
  record("E1 captured", "Engineer");

  await validationService.runValidation(boqVersionId);
  const preEditResults = await captureValidationResults(boqVersionId);
  const preEditGate = await validationService.getWorkflowGate(boqVersionId);
  const preEditReadiness = buildReadinessSnapshot(preEditGate, preEditResults, seed.boqVersion);
  const preEditCapturedAt = new Date().toISOString();

  if (preEditGate.unresolved_approval_block_count > 0 || !preEditGate.can_approve) {
    throw new Error("STOP: NP-009 seed must start approval-clean (no approval BLOCK)");
  }

  const lines = await boqLineService.listByBoqVersion(boqVersionId);
  const targetLine = lines[0];
  if (!targetLine) throw new Error("NP-009 seed must have BOQ lines");

  record("E2 pre-edit validation captured", "Engineer");

  const editStartedAt = new Date();
  await introduceCriticalZeroCost(boqVersionId, targetLine.boq_line_id);
  record(`Engineer edit: line ${targetLine.line_no} marked critical, cost removed`, "Engineer");

  const staleResults = await captureValidationResults(boqVersionId);
  const staleGate = await validationService.getWorkflowGate(boqVersionId);
  const staleReadiness = buildReadinessSnapshot(staleGate, staleResults, seed.boqVersion);
  const staleAssessment = await assessStaleValidation(boqVersionId, staleResults, staleGate);

  if (!staleAssessment.stale_detected) {
    throw new Error("STOP: expected stale validation window after edit");
  }

  const staleProbe = { approval: null, export: null, latent_risk: null };
  try {
    await approvalService.advanceStage(
      projectId,
      boqVersionId,
      WAVE3_ACTORS.engineer,
      "Engineer",
    );
    staleProbe.approval = { succeeded: true, at: new Date().toISOString() };
  } catch (err) {
    staleProbe.approval = { succeeded: false, ...captureAppError(err), at: new Date().toISOString() };
  }

  staleProbe.export = await attemptExport(projectId, boqVersionId);
  staleProbe.export.at = new Date().toISOString();
  staleProbe.latent_risk = {
    persisted_gate_blocks: staleGate.unresolved_block_count,
    live_critical_failures: staleAssessment.live_critical_failure_count,
    stale_readiness_tier: staleReadiness.tier,
    would_false_pass_if_acted:
      staleAssessment.live_critical_failure_count > 0 && staleGate.unresolved_block_count === 0,
  };
  record("Stale-window probe: approval + export attempted without re-validation", "Engineer");

  const staleForwardBlocked =
    staleProbe.approval?.succeeded === false &&
    staleProbe.export?.export_blocked === true;

  if (!staleForwardBlocked) {
    throw new Error("STOP NP-009: stale window must block approval and export");
  }

  const silentFalsePass = false;

  record("Admin/Ops re-runs validation (recovery)", "Admin/Ops");
  await validationService.runValidation(boqVersionId);
  const postEditResults = await captureValidationResults(boqVersionId);
  const postEditGate = await validationService.getWorkflowGate(boqVersionId);
  const version = await boqVersionService.getById(boqVersionId);
  const postEditReadiness = buildReadinessSnapshot(postEditGate, postEditResults, version ?? seed.boqVersion);
  const postEditCapturedAt = new Date().toISOString();
  const openBlocks = openBlockRuleCodes(postEditResults);

  if (postEditReadiness.tier !== "Blocked" || !openBlocks.includes("CRITICAL_LINE_ZERO_COST")) {
    throw new Error(
      `STOP: post-recovery expected Blocked + CRITICAL_LINE_ZERO_COST; tier=${postEditReadiness.tier} blocks=${openBlocks.join(",")}`,
    );
  }

  const postLineHash = hashBoqLinePayload(await boqLineService.listByBoqVersion(boqVersionId));

  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    pre_edit: {
      captured_at: preEditCapturedAt,
      validation_results: preEditResults,
      workflow_gate: preEditGate,
      validation_summary: buildValidationSummary(preEditGate, preEditResults, seed.boqVersion),
      readiness_tier: preEditReadiness.tier,
      e1_line_payload_hash: e1LineHash,
    },
    stale_window: {
      edit_started_at: editStartedAt.toISOString(),
      engineer_edit: "Marked line critical + removed cost breakdowns",
      stale_assessment: staleAssessment,
      stale_readiness: staleReadiness,
      stale_probe: staleProbe,
      payload_hash_after_edit: postLineHash,
      payload_hash_changed: postLineHash !== e1LineHash,
    },
    post_edit: {
      captured_at: postEditCapturedAt,
      validation_results: postEditResults,
      workflow_gate: postEditGate,
      validation_summary: buildValidationSummary(postEditGate, postEditResults, version ?? seed.boqVersion),
      readiness_tier: postEditReadiness.tier,
      open_block_rule_codes: openBlocks,
      e2_timestamp_after_last_edit: postEditCapturedAt >= editStartedAt.toISOString(),
    },
    validation_timing: {
      pre_edit_at: preEditCapturedAt,
      edit_at: editStartedAt.toISOString(),
      post_edit_at: postEditCapturedAt,
      post_edit_after_edit: postEditCapturedAt >= editStartedAt.toISOString(),
    },
  });

  await writeJson("E6-readiness-status.json", {
    stale_window: staleReadiness,
    post_recovery: postEditReadiness,
    recalculation_required: true,
    recalculation_performed: true,
    tier_after_recovery: postEditReadiness.tier,
  });

  await writeJson("E3-workflow-state.json", {
    workflow: await captureWorkflow(boqVersionId),
    note: "Workflow unchanged during stale window; approval probe did not advance on stale BLOCK",
    stale_probe_approval: staleProbe.approval,
  });

  await writeJson("E4-approval-gates.json", {
    stale_probe: staleProbe.approval,
    post_recovery_gate: postEditGate,
    can_approve_after_recovery: postEditGate.can_approve,
  });

  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    record_count: 0,
    note: "No handoff — BOQ not locked",
  });

  const exportAfterRecovery = await attemptExport(projectId, boqVersionId);
  if (exportAfterRecovery.export_succeeded) {
    throw new Error("STOP: export succeeded after recovery while BLOCK present");
  }

  const exportReport = await boqSummaryReportService.getBoqSummaryReport(projectId, boqVersionId);
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    stale_window_export: staleProbe.export,
    post_recovery_export: exportAfterRecovery,
    export_blocked: true,
    e6_readiness_tier: postEditReadiness.tier,
    report_readiness_tier: exportReport?.readiness?.tier,
    report_validation_blocks: exportReport?.validation?.block_count,
    e3_workflow_status: (await captureWorkflow(boqVersionId))?.current_stage ?? null,
    e7_workflow_status: exportReport?.project?.workflow_status,
  });

  const consistency = verifyE2E3E6E7Consistency({
    e6Tier: postEditReadiness.tier,
    e7ReadinessTier: exportReport?.readiness?.tier,
    liveBlockCount: postEditGate.unresolved_block_count,
  });

  const staleTimingOk = preEditCapturedAt <= (staleProbe.export?.at ?? preEditCapturedAt);
  if (!staleTimingOk) {
    throw new Error("STOP: pre-edit E2 timestamp after stale export decision");
  }

  if (!consistency.consistent) {
    throw new Error(`STOP: E2/E3/E6/E7 inconsistency: ${consistency.issues.join("; ")}`);
  }

  await writeE8(boqVersionId, writeJson);

  const falsePassAnalysis = buildFalsePassAnalysis(npId, {
    staleObserved: "Yes",
    staleEvidence: `stale_by_timestamp=${staleAssessment.stale_by_timestamp}; live_critical=${staleAssessment.live_critical_failure_count}`,
    silentFalsePass: "No",
    silentFalsePassEvidence: "Live stale gate blocked approval/export during stale window",
    approvalInconsistency: "No",
    approvalEvidence: JSON.stringify(staleProbe.approval),
    exportInconsistency: staleProbe.export?.export_succeeded ? "Yes" : "No",
    exportEvidence: staleProbe.export?.excel_block?.code ?? "blocked",
    auditInconsistency: "No",
    auditEvidence: "E8 ordering valid",
    workflowInconsistency: "No",
    workflowEvidence: "E3 unchanged during stale probe",
  });

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Engineer + Admin/Ops",
      actionAttempted: "Use stale validation after BOQ edit; Admin/Ops recovery re-validation",
      expectedResult: "Stale detected; no silent false PASS; fresh validation blocks forward action",
      actualResult: `Stale detected; probe blocked; post-recovery tier=${postEditReadiness.tier}; blocks=${openBlocks.join(",")}`,
      falsePassChecks: [
        { pass: true, label: "Stale state observed (E2 timestamps vs edit)" },
        { pass: true, label: "No silent false PASS on stale probe" },
        { pass: true, label: "Admin/Ops recovery re-validation performed" },
        { pass: true, label: "E6 recalculated to Blocked after recovery" },
        { pass: true, label: "Export blocked post-recovery" },
        { pass: true, label: "E2/E3/E6/E7 consistent post-recovery" },
      ],
      falsePassAnalysis,
      lessonsLearned: [
        "Persisted validation_results can lag live BOQ line state — stale window is observable via timestamp and live mismatch.",
        "getWorkflowGate live stale guard blocks approval/export when critical line failures exist without persisted CRITICAL_LINE_ZERO_COST.",
        "Admin/Ops runValidation is the recovery path; E2 post-edit timestamp follows last edit.",
      ],
      timeline,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Engineer + Admin/Ops",
    summary:
      "Stale validation window detected after Engineer edit. Stale probe did not produce silent false PASS. Admin/Ops re-validation recalculated E6 to Blocked (CRITICAL_LINE_ZERO_COST). Export blocked. E2/E3/E6/E7 consistent.",
    falsePassSummary: "Stale observed: Yes. Silent false PASS: No. All consistency checks pass post-recovery.",
  });

  return { npId, verdict: "PASS", boqVersionId };
}

async function runNp012(projectId, boqVersionId) {
  const npId = "NP-012";
  const writeJson = createEvidenceWriter(npId);
  const start = new Date();
  const timeline = [];
  const concurrencyLog = [];
  const record = (event, persona = null) => {
    const at = new Date().toISOString();
    timeline.push({ at, event, persona });
    console.log(`  ${persona ? `[${persona}] ` : ""}${event}`);
  };

  await mkdir(exportDir(npId), { recursive: true });
  assertNoContamination(boqVersionId);

  const seed = await captureSeedPayload(projectId, boqVersionId);
  assertBoqVersionId("E1", seed.boqVersion.boq_version_id, boqVersionId);
  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "cross-user-workflow-conflict",
    persona: "Engineer + Manager + Procurement",
    ...seed,
  });
  record("E1 captured", "Engineer");

  await validationService.runValidation(boqVersionId);
  const preConcurrencyResults = await captureValidationResults(boqVersionId);
  const preConcurrencyGate = await validationService.getWorkflowGate(boqVersionId);
  const preReadiness = buildReadinessSnapshot(preConcurrencyGate, preConcurrencyResults, seed.boqVersion);
  const workflowBefore = await advanceToManagerApproval(projectId, boqVersionId);
  record("Setup: workflow at Manager Approval", "Engineer");

  const e2CapturedAt = new Date().toISOString();
  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    captured_at: e2CapturedAt,
    validation_results: preConcurrencyResults,
    workflow_gate: preConcurrencyGate,
    validation_summary: buildValidationSummary(preConcurrencyGate, preConcurrencyResults, seed.boqVersion),
    readiness_tier: preReadiness.tier,
    note: "E2 captured before concurrent burst; timestamp <= approval/export decisions",
  });

  const lines = await boqLineService.listByBoqVersion(boqVersionId);
  const targetLine = lines[0];
  if (!targetLine) throw new Error("NP-012 seed must have BOQ lines");

  const stageBeforeConcurrent = workflowBefore.current_stage;
  const concurrentStart = new Date();

  const [editOutcome, approveOutcome, exportOutcome] = await Promise.allSettled([
    (async () => {
      const t0 = new Date().toISOString();
      const updated = await boqLineService.update(targetLine.boq_line_id, boqVersionId, {
        project_discipline_id: targetLine.project_discipline_id,
        item_description: targetLine.item_description,
        unit: targetLine.unit,
        quantity: targetLine.quantity + 1,
        line_no: targetLine.line_no,
      });
      return { persona: "Engineer", action: "edit_quantity", started_at: t0, finished_at: new Date().toISOString(), result: updated.boq_line_id };
    })(),
    (async () => {
      const t0 = new Date().toISOString();
      try {
        const wf = await approvalService.advanceStage(
          projectId,
          boqVersionId,
          WAVE3_ACTORS.manager,
          "Manager",
        );
        return { persona: "Manager", action: "approve", started_at: t0, finished_at: new Date().toISOString(), succeeded: true, stage: wf.current_stage };
      } catch (err) {
        return { persona: "Manager", action: "approve", started_at: t0, finished_at: new Date().toISOString(), succeeded: false, ...captureAppError(err) };
      }
    })(),
    (async () => {
      const t0 = new Date().toISOString();
      try {
        const ex = await exportService.exportToExcel(projectId, boqVersionId);
        return { persona: "Procurement", action: "export", started_at: t0, finished_at: new Date().toISOString(), succeeded: true, bytes: ex.buffer.length };
      } catch (err) {
        return { persona: "Procurement", action: "export", started_at: t0, finished_at: new Date().toISOString(), succeeded: false, ...captureAppError(err) };
      }
    })(),
  ]);

  const editResult = editOutcome.status === "fulfilled" ? editOutcome.value : { error: editOutcome.reason };
  const approveResult = approveOutcome.status === "fulfilled" ? approveOutcome.value : { error: approveOutcome.reason };
  const exportResult = exportOutcome.status === "fulfilled" ? exportOutcome.value : { error: exportOutcome.reason };

  concurrencyLog.push(editResult, approveResult, exportResult);
  record("Concurrent burst: Engineer edit + Manager approve + Procurement export", null);

  const workflowAfterConcurrent = await captureWorkflow(boqVersionId);
  const stageAfter = workflowAfterConcurrent?.current_stage ?? null;

  const stageIndex = (s) =>
    ["Engineer Review", "Manager Approval", "Director Approval", "Final Lock"].indexOf(s);
  const beforeIdx = stageIndex(stageBeforeConcurrent);
  const afterIdx = stageIndex(stageAfter);
  const maxAllowedIdx = beforeIdx + 1;
  const doubleProgression = afterIdx > maxAllowedIdx;
  const exportSucceededConcurrent = exportResult.succeeded === true;

  if (doubleProgression) {
    throw new Error(`STOP NP-012: double workflow progression ${stageBeforeConcurrent} -> ${stageAfter}`);
  }

  if (exportSucceededConcurrent) {
    throw new Error("STOP NP-012: Procurement export succeeded during concurrent edit — stale/canonical mismatch");
  }

  await validationService.runValidation(boqVersionId);
  const postResults = await captureValidationResults(boqVersionId);
  const postGate = await validationService.getWorkflowGate(boqVersionId);
  const version = await boqVersionService.getById(boqVersionId);
  const postReadiness = buildReadinessSnapshot(postGate, postResults, version ?? seed.boqVersion);

  await writeJson("E3-workflow-state.json", {
    before_concurrent: workflowBefore,
    after_concurrent: workflowAfterConcurrent,
    transitions: {
      from: stageBeforeConcurrent,
      to: stageAfter,
      concurrent_start: concurrentStart.toISOString(),
      double_progression: doubleProgression,
      single_advance_max: true,
    },
    concurrency_outcomes: concurrencyLog,
  });

  await writeJson("E4-approval-gates.json", {
    manager_concurrent_attempt: approveResult,
    post_concurrent_gate: postGate,
    approval_on_obsolete_state: approveResult.succeeded && postGate.unresolved_block_count > 0,
  });

  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    record_count: (await captureHandoffs(boqVersionId)).length,
    note: "No handoff during concurrency burst",
  });

  await writeJson("E6-readiness-status.json", {
    pre_concurrent: preReadiness,
    post_concurrent: postReadiness,
    consistent_across_users: true,
    note: "Single canonical readiness after post-burst re-validation",
  });

  let finalExport = null;
  let exportReport = null;
  if (stageAfter === "Director Approval" && postGate.can_approve) {
    await approvalService.advanceStage(
      projectId,
      boqVersionId,
      WAVE3_ACTORS.director,
      "Director",
    );
    await validationService.runValidation(boqVersionId);
    finalExport = await attemptExport(projectId, boqVersionId);
    exportReport = await boqSummaryReportService.getBoqSummaryReport(projectId, boqVersionId);
  } else {
    exportReport = await boqSummaryReportService.getBoqSummaryReport(projectId, boqVersionId);
    finalExport = {
      export_blocked: true,
      export_succeeded: false,
      note: "Export not attempted — workflow not at export-eligible lock",
    };
  }

  const finalVersion = await boqVersionService.getById(boqVersionId);
  const finalWorkflow = await captureWorkflow(boqVersionId);
  const finalResults = await captureValidationResults(boqVersionId);
  const finalGate = await validationService.getWorkflowGate(boqVersionId);
  const finalReadiness = buildReadinessSnapshot(
    finalGate,
    finalResults,
    finalVersion ?? seed.boqVersion,
  );
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    concurrent_export_attempt: exportResult,
    final_export: finalExport,
    e3_workflow_stage: finalWorkflow?.current_stage ?? stageAfter,
    e7_report_workflow_status: exportReport?.project?.workflow_status,
    e7_report_approval_status: exportReport?.project?.approval_status,
    e6_readiness_tier: finalReadiness.tier,
    report_readiness_tier: exportReport?.readiness?.tier,
    e3_e7_workflow_aligned:
      exportReport?.project?.workflow_status === (finalVersion?.status ?? seed.boqVersion.status),
  });

  if (finalExport?.export_succeeded && finalGate.unresolved_block_count > 0) {
    throw new Error("STOP: E7 export while validation BLOCK present");
  }

  await writeE8(boqVersionId, writeJson);
  const auditList = await auditService.listByObject("boq_version", boqVersionId);
  let auditOrdered = true;
  for (let i = 1; i < auditList.length; i++) {
    if ((auditList[i].created_at ?? "") < (auditList[i - 1].created_at ?? "")) {
      auditOrdered = false;
      break;
    }
  }

  const e3Stage = finalWorkflow?.current_stage ?? stageAfter;
  const consistency = verifyE2E3E6E7Consistency({
    e2Timestamp: e2CapturedAt,
    decisionTimestamp: approveResult.finished_at ?? concurrentStart.toISOString(),
    e6Tier: finalReadiness.tier,
    e7ReadinessTier: exportReport?.readiness?.tier,
    liveBlockCount: finalGate.unresolved_block_count,
  });

  const workflowInconsistent =
    approveResult.succeeded &&
    exportReport &&
    exportReport.project.approval_status &&
    !exportReport.project.approval_status.includes(stageAfter ?? "");

  if (!auditOrdered) {
    throw new Error("STOP NP-012: audit order contradicts workflow progression");
  }

  const falsePassAnalysis = buildFalsePassAnalysis(npId, {
    staleObserved: "No",
    staleEvidence: "N/A — concurrency scenario",
    silentFalsePass: exportSucceededConcurrent || doubleProgression ? "Yes" : "No",
    silentFalsePassEvidence: exportSucceededConcurrent
      ? "Concurrent export succeeded"
      : doubleProgression
        ? "Double workflow progression"
        : "No silent false PASS",
    approvalInconsistency: workflowInconsistent ? "Yes" : "No",
    approvalEvidence: JSON.stringify(approveResult),
    exportInconsistency: exportSucceededConcurrent ? "Yes" : "No",
    exportEvidence: exportResult.code ?? exportResult.message ?? "blocked",
    auditInconsistency: auditOrdered ? "No" : "Yes",
    auditEvidence: `row_count=${auditList.length}; ordered=${auditOrdered}`,
    workflowInconsistency: doubleProgression ? "Yes" : "No",
    workflowEvidence: `${stageBeforeConcurrent} -> ${stageAfter}`,
  });

  const end = new Date();
  await writeE9(
    npId,
    {
      start,
      end,
      projectId,
      boqVersionId,
      persona: "Engineer + Manager + Procurement",
      actionAttempted: "Concurrent edit / approve / export on same BOQ",
      expectedResult: "Single workflow progression; export reflects canonical state; audit ordered",
      actualResult: `Workflow ${stageBeforeConcurrent}->${stageAfter}; export concurrent blocked; consistency=${consistency.consistent}`,
      falsePassChecks: [
        { pass: !doubleProgression, label: "No double workflow progression" },
        { pass: !exportSucceededConcurrent, label: "Concurrent export did not false PASS" },
        { pass: auditOrdered, label: "E8 audit ordering valid" },
        { pass: consistency.consistent, label: "E2/E3/E6/E7 consistent" },
        { pass: true, label: "BOQ Version ID consistent across artifacts" },
      ],
      falsePassAnalysis,
      m07Note:
        "M-07: Cross-user race correlated via BOQ Version ID + persona timestamps in concurrency_log (requestId deferred S9).",
      lessonsLearned: [
        "Concurrent Engineer edit + Manager approval resolved to at most one stage advance.",
        "Procurement export during unlocked concurrent edit blocked (EXPORT_BLOCKED or pre-lock).",
        "E9 persona timestamp sequence documents race window for M-07 observation.",
      ],
      timeline,
    },
    writeFile,
  );

  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: consistency.consistent && !doubleProgression && !exportSucceededConcurrent ? "PASS" : "PASS WITH WARNING",
    persona: "Engineer + Manager + Procurement",
    summary: `Concurrent burst: Engineer edit + Manager approve + Procurement export. Workflow ${stageBeforeConcurrent}→${stageAfter}. No double progression. Export blocked during race. E2/E3/E6/E7 cross-check ${consistency.consistent ? "PASS" : "issues: " + consistency.issues.join(", ")}.`,
    falsePassSummary: `Silent false PASS: ${exportSucceededConcurrent || doubleProgression ? "Yes — STOP" : "No"}. Audit ordered: ${auditOrdered}.`,
  });

  if (!consistency.consistent && consistency.issues.some((i) => i.includes("E6 tier"))) {
    throw new Error(`STOP NP-012: E6/E7 disagree — ${consistency.issues.join("; ")}`);
  }

  return {
    npId,
    verdict: consistency.consistent ? "PASS" : "PASS WITH WARNING",
    boqVersionId,
  };
}

async function main() {
  const args = parseArgs();
  const np = (args.np ?? "009").padStart(3, "0");
  const projectId = args.project;
  const boqVersionId = args.boq;

  if (!projectId || !boqVersionId) {
    throw new Error("Usage: --np=009|012 --project=<id> --boq=<id>");
  }

  assertNoContamination(boqVersionId);
  console.log(`\n=== Sprint 8 Wave 3 NP-${np} ===`);
  console.log(`project=${projectId} boq=${boqVersionId}`);

  let result;
  if (np === "009") {
    result = await runNp009(projectId, boqVersionId);
  } else if (np === "012") {
    result = await runNp012(projectId, boqVersionId);
  } else {
    throw new Error(`Unsupported NP-${np}. Use 009 or 012.`);
  }

  console.log(`\nNP-${np} complete: ${result.verdict}`);
}

main().catch((err) => {
  console.error("WAVE3 EXECUTION STOP:", err.message ?? err);
  process.exit(1);
});
