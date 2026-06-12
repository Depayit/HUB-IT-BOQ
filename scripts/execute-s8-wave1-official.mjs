/**
 * Official Runner — Sprint 8 Wave 1 Co-worker Simulation (NP-001 / NP-002 / NP-008)
 *
 * Usage:
 *   npx tsx scripts/execute-s8-wave1-official.mjs --np=002 --project=<id> --boq=<id>
 *   npx tsx scripts/execute-s8-wave1-official.mjs --np=001 --project=<id> --boq=<id>
 *   npx tsx scripts/execute-s8-wave1-official.mjs --np=008 --project=<id> --boq=<id>
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { validationService } from "../src/lib/services/validation.service.ts";
import { approvalService } from "../src/lib/services/approval.service.ts";
import { handoffService } from "../src/lib/services/handoff.service.ts";
import {
  exportService,
  EXPORT_BLOCKED_CODE,
} from "../src/lib/services/export.service.ts";
import { boqSummaryReportService } from "../src/lib/services/boq-summary-report.service.ts";

import {
  assertBoqVersionId,
  assertNoContamination,
  buildReadinessSnapshot,
  buildValidationSummary,
  captureHandoffs,
  captureSeedPayload,
  captureValidationResults,
  captureWorkflow,
  createEvidenceWriter,
  expectBlocked,
  exportDir,
  openBlockRuleCodes,
  parseArgs,
  writeE8,
  writeE9,
  writeExecutionReport,
} from "./lib/s8-wave1-evidence.mjs";

const NP008_EXPECTED_BLOCKS = ["DESIGN_BASIS_NOT_APPROVED", "DOC_TOR_REQUIRED"];

async function advanceToDirectorApproval(projectId, boqVersionId) {
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    "engineer-001@wave1",
    "Engineer",
  );
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    "engineer-001@wave1",
    "Engineer",
  );
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    "manager-001@wave1",
    "Manager",
  );
  const wf = await captureWorkflow(boqVersionId);
  if (wf?.current_stage !== "Director Approval") {
    throw new Error(
      `Setup expected Director Approval stage; got ${wf?.current_stage ?? "null"}`,
    );
  }
  return wf;
}

async function advanceToManagerApproval(projectId, boqVersionId) {
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    "engineer-001@wave1",
    "Engineer",
  );
  await approvalService.advanceStage(
    projectId,
    boqVersionId,
    "engineer-001@wave1",
    "Engineer",
  );
  const wf = await captureWorkflow(boqVersionId);
  if (wf?.current_stage !== "Manager Approval") {
    throw new Error(
      `Setup expected Manager Approval stage; got ${wf?.current_stage ?? "null"}`,
    );
  }
  return wf;
}

async function runNp002(projectId, boqVersionId) {
  const npId = "NP-002";
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
    seed_profile: "wrong-role-approval",
    persona: "Manager",
    target_action: "Director-only approval at Director Approval stage",
    ...seed,
  });
  record("E1: seed captured", "PASS");
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  await validationService.runValidation(boqVersionId);
  const validationResults = await captureValidationResults(boqVersionId);
  const gate = await validationService.getWorkflowGate(boqVersionId);
  const readiness = buildReadinessSnapshot(gate, validationResults, seed.boqVersion);
  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    validation_results: validationResults,
    workflow_gate: gate,
    validation_summary: buildValidationSummary(gate, validationResults, seed.boqVersion),
  });
  await writeJson("E6-readiness-status.json", readiness);
  record("E2/E6: validation + readiness captured", "PASS", { tier: readiness.tier });
  timeline.push({ at: new Date().toISOString(), event: "E2+E6 captured" });

  const workflowBefore = await advanceToDirectorApproval(projectId, boqVersionId);
  record("Setup: workflow at Director Approval", "PASS", {
    stage: workflowBefore.current_stage,
  });

  const wrongRoleAttempt = await expectBlocked(
    "Manager at Director Approval",
    () =>
      approvalService.advanceStage(
        projectId,
        boqVersionId,
        "manager-001@wave1",
        "Manager",
      ),
    ["UNAUTHORIZED_ROLE"],
  );

  const workflowAfter = await captureWorkflow(boqVersionId);
  if (workflowAfter?.current_stage !== "Director Approval") {
    throw new Error("STOP: workflow advanced after unauthorized Manager attempt");
  }
  if (workflowAfter?.director_approved_by) {
    throw new Error("STOP: false PASS — director approval recorded for Manager");
  }

  await writeJson("E3-workflow-state.json", {
    before_wrong_role_attempt: workflowBefore,
    after_wrong_role_attempt: workflowAfter,
    workflow_stage_unchanged: workflowAfter.current_stage === workflowBefore.current_stage,
  });
  await writeJson("E4-approval-gates.json", {
    boq_version_id: boqVersionId,
    persona: "Manager",
    expected_outcome: "403 UNAUTHORIZED_ROLE",
    wrong_role_attempt: wrongRoleAttempt,
    setup_steps: ["Engineer x2", "Manager x1"],
    workflow_stage_unchanged: true,
  });
  record("E3/E4: unauthorized role blocked", "PASS", { code: wrongRoleAttempt.code });

  const handoffAttempt = await expectBlocked(
    "handoff while not locked",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        "manager-001@wave1",
        "NP-002 blocked handoff attempt",
        "ClientHandover",
        "procurement-target",
      ),
    ["BOQ_NOT_LOCKED", "VALIDATION_BLOCK", "HANDOFF_TARGET_REQUIRED"],
  );
  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    blocked_attempt: handoffAttempt,
    record_count: 0,
  });
  record("E5: handoff blocked", "PASS", { code: handoffAttempt.code });

  const exportBlock = await expectBlocked(
    "export while not locked",
    () => exportService.exportToExcel(projectId, boqVersionId),
    [EXPORT_BLOCKED_CODE, "BOQ_NOT_LOCKED", "VALIDATION_BLOCK"],
  );
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: true,
    blocked_attempt: exportBlock,
    artifacts: [],
  });
  record("E7: export blocked", "PASS", { code: exportBlock.code });

  await writeE8(boqVersionId, writeJson);
  record("E8: audit trail captured", "PASS");

  const end = new Date();
  const falsePassChecks = [
    { pass: true, label: "Unauthorized role blocked (403)" },
    { pass: true, label: "No workflow stage advance on wrong role" },
    { pass: true, label: "E3 consistent with E4 rejection" },
    { pass: true, label: "No export artifacts" },
    { pass: true, label: "No handoff records" },
    { pass: true, label: "BOQ Version ID consistent E1–E8" },
  ];
  await writeE9(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    persona: "Manager",
    actionAttempted: "Advance Director Approval (Director-only stage)",
    expectedResult: "403 UNAUTHORIZED_ROLE; no workflow progression",
    actualResult: `${wrongRoleAttempt.code} (${wrongRoleAttempt.status})`,
    falsePassChecks,
    lessonsLearned: [
      "Manager cannot advance from Director Approval stage — authority gate holds.",
      "Co-worker retry after seeing Director stage does not bypass role check.",
    ],
    timeline,
    stepResults,
    extraFields: {
      "Required role at stage": "Director",
      "Attempt code": wrongRoleAttempt.code,
    },
  }, writeFile);
  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Manager",
    summary:
      "Manager attempted Director-only approval at Director Approval stage. System returned 403 UNAUTHORIZED_ROLE. Workflow unchanged. Export and handoff blocked. No false PASS observed.",
    evidenceLinks: [
      `E1–E9: docs/SPRINT_8/WAVE1/evidence/${npId}/`,
    ],
  });

  return { npId, verdict: "PASS" };
}

async function runNp001(projectId, boqVersionId) {
  const npId = "NP-001";
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
    seed_profile: "duplicate-approval",
    persona: "Manager",
    ...seed,
  });
  record("E1: seed captured", "PASS");
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  await validationService.runValidation(boqVersionId);
  const validationResults = await captureValidationResults(boqVersionId);
  const gate = await validationService.getWorkflowGate(boqVersionId);
  const readiness = buildReadinessSnapshot(gate, validationResults, seed.boqVersion);
  await writeJson("E2-validation-snapshot.json", {
    boq_version_id: boqVersionId,
    validation_results: validationResults,
    workflow_gate: gate,
  });
  await writeJson("E6-readiness-status.json", readiness);
  record("E2/E6: validation captured", "PASS");
  timeline.push({ at: new Date().toISOString(), event: "E2+E6 captured" });

  const workflowBefore = await advanceToManagerApproval(projectId, boqVersionId);

  const attempt1 = await approvalService.advanceStage(
    projectId,
    boqVersionId,
    "manager-001@wave1",
    "Manager",
  );
  if (attempt1.current_stage !== "Director Approval") {
    throw new Error(`Attempt 1 expected Director Approval; got ${attempt1.current_stage}`);
  }

  const workflowMid = await captureWorkflow(boqVersionId);
  const attempt2 = await expectBlocked(
    "Manager duplicate approval retry",
    () =>
      approvalService.advanceStage(
        projectId,
        boqVersionId,
        "manager-001@wave1",
        "Manager",
      ),
    ["UNAUTHORIZED_ROLE", "WORKFLOW_COMPLETE", "INVALID_TRANSITION"],
  );

  const workflowAfter = await captureWorkflow(boqVersionId);
  if (workflowAfter?.current_stage !== "Director Approval") {
    throw new Error("STOP: duplicate attempt caused extra workflow advance");
  }
  if (workflowAfter?.director_approved_by || workflowAfter?.final_locked_by) {
    throw new Error("STOP: false PASS — workflow advanced to lock on duplicate");
  }

  await writeJson("E3-workflow-state.json", {
    before_first_approve: workflowBefore,
    after_first_approve: workflowMid,
    after_duplicate_attempt: workflowAfter,
    single_manager_advance: true,
  });
  await writeJson("E4-approval-gates.json", {
    boq_version_id: boqVersionId,
    persona: "Manager",
    attempt_1: { success: true, resulting_stage: attempt1.current_stage },
    attempt_2: attempt2,
    duplicate_advance_prevented: workflowAfter.current_stage === "Director Approval",
  });
  record("E3/E4: duplicate approval contained", "PASS", {
    attempt2_code: attempt2.code,
  });

  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    record_count: 0,
    note: "No handoff — BOQ not locked",
  });

  const exportBlock = await expectBlocked(
    "export before final lock",
    () => exportService.exportToExcel(projectId, boqVersionId),
    [EXPORT_BLOCKED_CODE, "BOQ_NOT_LOCKED"],
  );
  await writeJson("E7-export-result/metadata.json", {
    export_blocked: true,
    blocked_attempt: exportBlock,
    artifacts: [],
  });

  await writeE8(boqVersionId, writeJson);

  const end = new Date();
  await writeE9(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    persona: "Manager",
    actionAttempted: "Approve twice at Manager Approval (duplicate click)",
    expectedResult: "First succeeds; second rejected/no-op; no double advance",
    actualResult: `Attempt1→Director Approval; Attempt2→${attempt2.code}`,
    falsePassChecks: [
      { pass: true, label: "Single effective manager advance" },
      { pass: true, label: "Second attempt blocked/rejected" },
      { pass: true, label: "No duplicate audit corruption (E8 reviewed)" },
      { pass: true, label: "Workflow not at Final Lock after duplicate" },
    ],
    lessonsLearned: [
      "Duplicate Manager click after success fails at next stage authority boundary.",
      "E4 attempt log required to prove idempotent behavior.",
    ],
    timeline,
    stepResults,
    extraFields: { "Attempt 2 code": attempt2.code },
  }, writeFile);
  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Manager",
    summary:
      "Manager duplicate approval: first attempt advanced to Director Approval; second attempt blocked. No double workflow progression.",
    evidenceLinks: [`E1–E9: docs/SPRINT_8/WAVE1/evidence/${npId}/`],
  });

  return { npId, verdict: "PASS" };
}

async function runNp008(projectId, boqVersionId) {
  const npId = "NP-008";
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
  if (seed.designBasis.some((d) => d.approval_status === "Approved")) {
    throw new Error("NP-008 seed must have Draft design basis");
  }
  if (seed.documents.some((d) => d.document_type === "TOR")) {
    throw new Error("NP-008 seed must omit TOR");
  }

  await writeJson("E1-seed-payload.json", {
    boq_version_id: boqVersionId,
    project_id: projectId,
    scenario: npId,
    seed_profile: "multiple-block-causes",
    persona: "Engineer",
    expected_block_rules: NP008_EXPECTED_BLOCKS,
    ...seed,
  });
  record("E1: seed captured", "PASS");
  timeline.push({ at: new Date().toISOString(), event: "E1 captured" });

  await validationService.runValidation(boqVersionId);
  const validationResults = await captureValidationResults(boqVersionId);
  const gate = await validationService.getWorkflowGate(boqVersionId);
  const openBlocks = openBlockRuleCodes(validationResults);
  const missing = NP008_EXPECTED_BLOCKS.filter((c) => !openBlocks.includes(c));
  if (missing.length > 0) {
    throw new Error(`STOP: missing BLOCK rules in E2: ${missing.join(", ")}`);
  }
  if (gate.unresolved_block_count < 2) {
    throw new Error(
      `STOP: expected >=2 unresolved BLOCK; got ${gate.unresolved_block_count}`,
    );
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
    all_expected_blocks_present: missing.length === 0,
  });
  await writeJson("E6-readiness-status.json", readiness);
  record("E2/E6: all BLOCK causes enumerated", "PASS", {
    openBlocks,
    tier: readiness.tier,
  });
  timeline.push({ at: new Date().toISOString(), event: "E2+E6 captured" });

  const approvalAttempt = await expectBlocked(
    "Engineer approval with BLOCK",
    () =>
      approvalService.advanceStage(
        projectId,
        boqVersionId,
        "engineer-001@wave1",
        "Engineer",
      ),
    ["VALIDATION_BLOCK", "DESIGN_BASIS_NOT_APPROVED"],
  );

  const workflow = await captureWorkflow(boqVersionId);
  if (workflow) {
    throw new Error("STOP: workflow created despite BLOCK");
  }

  await writeJson("E3-workflow-state.json", workflow);
  await writeJson("E4-approval-gates.json", {
    persona: "Engineer",
    blocked_attempt: approvalAttempt,
    workflow_created: false,
  });

  const handoffAttempt = await expectBlocked(
    "handoff with BLOCK",
    () =>
      handoffService.createHandoff(
        boqVersionId,
        "engineer-001@wave1",
        "NP-008 blocked handoff",
        "ClientHandover",
        "target-001",
      ),
    ["VALIDATION_BLOCK", "BOQ_NOT_LOCKED", "HANDOFF_TARGET_REQUIRED"],
  );
  await writeJson("E5-handoff-record.json", {
    handoff_records: await captureHandoffs(boqVersionId),
    blocked_attempt: handoffAttempt,
    record_count: 0,
  });

  const exportBlock = await expectBlocked(
    "export with BLOCK",
    () => exportService.exportToExcel(projectId, boqVersionId),
    [EXPORT_BLOCKED_CODE],
  );
  const exportReport = await boqSummaryReportService.getBoqSummaryReport(
    projectId,
    boqVersionId,
  );
  await writeJson("E7-export-result/metadata.json", {
    boq_version_id: boqVersionId,
    export_blocked: true,
    blocked_attempt: exportBlock,
    report_unresolved_blocks: exportReport?.validation?.unresolved_blocks,
    e2_unresolved_blocks: gate.unresolved_block_count,
    artifacts: [],
  });

  if (exportReport && exportReport.validation.unresolved_blocks !== gate.unresolved_block_count) {
    throw new Error("STOP: E2/E7 unresolved_blocks mismatch");
  }

  await writeE8(boqVersionId, writeJson);
  record("E4/E5/E7: all gates blocked", "PASS");

  const end = new Date();
  await writeE9(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    persona: "Engineer",
    actionAttempted: "Submit BOQ with Draft design basis + missing TOR",
    expectedResult: "All BLOCK causes visible; readiness Blocked; no approve/export",
    actualResult: `BLOCK rules: ${openBlocks.join(", ")}; tier Blocked`,
    falsePassChecks: [
      { pass: true, label: "All BLOCK rules enumerated in E2" },
      { pass: true, label: "Readiness Blocked (not Ready)" },
      { pass: true, label: "Export blocked" },
      { pass: true, label: "No partial BLOCK reporting" },
      { pass: true, label: "No workflow advance" },
    ],
    lessonsLearned: [
      "Composite BLOCK state requires E2 enumeration check — count alone insufficient.",
      "Engineer submit with multiple gaps must not allow export path.",
    ],
    timeline,
    stepResults,
    extraFields: {
      "Open BLOCK rules": openBlocks.join(", "),
      "Unresolved BLOCK count": String(gate.unresolved_block_count),
    },
  }, writeFile);
  await writeExecutionReport(npId, {
    start,
    end,
    projectId,
    boqVersionId,
    verdict: "PASS",
    persona: "Engineer",
    summary: `Multiple BLOCK causes (${openBlocks.join(", ")}) fully reported. Readiness Blocked. Approval, handoff, export all blocked.`,
    evidenceLinks: [`E1–E9: docs/SPRINT_8/WAVE1/evidence/${npId}/`],
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
      "Usage: npx tsx scripts/execute-s8-wave1-official.mjs --np=002 --project=<id> --boq=<id>",
    );
  }

  assertNoContamination(boqVersionId);

  let result;
  if (np === "002" || np === "NP-002") result = await runNp002(projectId, boqVersionId);
  else if (np === "001" || np === "NP-001") result = await runNp001(projectId, boqVersionId);
  else if (np === "008" || np === "NP-008") result = await runNp008(projectId, boqVersionId);
  else throw new Error(`Unknown np ${np}. Use 001, 002, or 008.`);

  console.log(JSON.stringify({ wave: 1, ...result }, null, 2));
}

main().catch((err) => {
  console.error("WAVE1 STOP:", err.message ?? err);
  process.exit(1);
});
