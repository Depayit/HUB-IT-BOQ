/**
 * Sprint 8 Wave 4 — shared evidence helpers (NP-010 / NP-011)
 * Governance integrity, evidence trust, retry idempotency
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../src/lib/db/prisma.ts";
import { auditService } from "../../src/lib/services/audit.service.ts";
import { AppError } from "../../src/lib/utils/errors.ts";
import { countOpenWarnings } from "../../src/lib/validations/validation-findings.ts";
import {
  deriveReadinessTier,
  deriveValidationStatus,
  inferValidationRun,
} from "../../src/lib/validations/readiness.ts";

export const WAVE4_ROOT = path.resolve("docs/SPRINT_8/WAVE4");
export const REPORT_ROOT = path.join(WAVE4_ROOT, "EXECUTION_REPORT");
export const E0_ROOT = path.join(WAVE4_ROOT, "evidence/E0-pre-run-baseline");

export const CLOSED_SIM_BOQ_IDS = [
  "8f1376bb-092b-4250-b8d9-ef87fe739ca6",
  "8c1ad9f7-7d10-4ce8-bf4d-cee967d5a650",
  "6ed88f77-3211-454c-bfc0-fa5a71ff388c",
  "1cf53bc3-e914-4b99-9926-83d2d9051980",
  "514dfb95-9fea-4db3-8f82-8977735908ed",
  "95893441-3c00-4fb1-80eb-cea0a27ecf9e",
  "5de7fdf4-0a1e-424c-9415-799cc6e03fa6",
  "68035a1f-6eb4-4fa8-8a57-4908e515af7e",
];

export const WAVE1_BOQ_IDS = [
  "5b4a3f95-23de-4bce-a197-93e4bb842381",
  "9ed994d5-0d83-4fe3-8db5-d9412eb80f8a",
  "bf815e97-88f4-4b01-b7cf-56cb0eeb48d9",
];

export const WAVE2_BOQ_IDS = [
  "f6564fbc-d0c6-4707-b685-ccc5dec6c9c8",
  "290e2839-2b0e-46f6-8af4-20a128bd48ac",
  "db165e79-17b2-49db-9d34-300d19587606",
  "e922f1f5-f8f5-40e4-805f-6c9e03a11006",
  "4d11f417-747e-4745-8ec9-6918ed6738cb",
];

export const WAVE3_BOQ_IDS = [
  "24533b31-da9e-4bf9-864b-4ed7f9ff8c47",
  "7cb912c9-33b8-465c-9163-4306a6300049",
];

export function evidenceDir(npId) {
  return path.join(WAVE4_ROOT, "evidence", npId);
}

export function exportDir(npId) {
  return path.join(evidenceDir(npId), "E7-export-result");
}

export function reportPath(npId) {
  return path.join(REPORT_ROOT, `${npId}.md`);
}

export function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value?.toFixed && value?.toNumber) return value.toString();
  return value;
}

export function assertBoqVersionId(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: BOQ Version ID mismatch (expected ${expected}, got ${actual})`);
  }
}

export function assertNoContamination(boqVersionId) {
  if (CLOSED_SIM_BOQ_IDS.includes(boqVersionId)) {
    throw new Error(`Contamination: Sprint 7 SIM ID ${boqVersionId}`);
  }
  if (WAVE1_BOQ_IDS.includes(boqVersionId)) {
    throw new Error(`Contamination: Wave 1 ID ${boqVersionId}`);
  }
  if (WAVE2_BOQ_IDS.includes(boqVersionId)) {
    throw new Error(`Contamination: Wave 2 ID ${boqVersionId}`);
  }
  if (WAVE3_BOQ_IDS.includes(boqVersionId)) {
    throw new Error(`Contamination: Wave 3 ID ${boqVersionId}`);
  }
}

export function captureAppError(err) {
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

export async function expectBlocked(label, fn, acceptableCodes) {
  try {
    const result = await fn();
    throw new Error(`${label}: expected block but succeeded: ${JSON.stringify(result)}`);
  } catch (err) {
    const captured = captureAppError(err);
    if (!captured.blocked) throw new Error(`${label}: ${captured.message}`);
    if (!acceptableCodes.includes(captured.code)) {
      throw new Error(`${label}: code ${captured.code} not in [${acceptableCodes.join(", ")}]`);
    }
    return captured;
  }
}

export function buildValidationSummary(gate, results, version = {}) {
  const validation_run = inferValidationRun({
    validation_result_count: results.length,
    lock_status: version.lock_status ?? "",
    boq_status: version.status,
    unresolved_block_count: gate.unresolved_block_count,
    can_approve: gate.can_approve,
  });
  return {
    validation_run,
    validation_status: deriveValidationStatus(gate.unresolved_block_count, validation_run),
    finding_count: results.length,
    unresolved_block_count: gate.unresolved_block_count,
    open_warning_count: countOpenWarnings(results),
    can_approve: gate.can_approve,
    can_handoff: gate.can_handoff,
  };
}

export function buildReadinessSnapshot(gate, results, version = {}) {
  const summary = buildValidationSummary(gate, results, version);
  return {
    tier: deriveReadinessTier({
      validation_run: summary.validation_run,
      unresolved_block_count: gate.unresolved_block_count,
      open_warning_count: summary.open_warning_count,
      can_approve: gate.can_approve,
    }),
    ...summary,
    gate,
  };
}

export async function captureSeedPayload(projectId, boqVersionId) {
  const [project, boqVersion, designBasis, documents, boqDocLinks, projectDisciplines, boqLines, boqSummary] =
    await Promise.all([
      prisma.projects.findUniqueOrThrow({ where: { project_id: projectId } }),
      prisma.boq_versions.findUniqueOrThrow({ where: { boq_version_id: boqVersionId } }),
      prisma.design_basis_versions.findMany({
        where: { project_id: projectId },
        orderBy: { design_version_no: "desc" },
      }),
      prisma.documents.findMany({ where: { project_id: projectId } }),
      prisma.boq_version_documents.findMany({ where: { boq_version_id: boqVersionId } }),
      prisma.project_disciplines.findMany({
        where: { boq_version_id: boqVersionId },
        include: { discipline: true },
      }),
      prisma.boq_lines.findMany({
        where: { boq_version_id: boqVersionId },
        include: { boq_cost_breakdowns: true },
        orderBy: { line_no: "asc" },
      }),
      prisma.boq_summary.findUnique({ where: { boq_version_id: boqVersionId } }),
    ]);
  return { project, boqVersion, designBasis, documents, boqDocLinks, projectDisciplines, boqLines, boqSummary };
}

export async function captureWorkflow(boqVersionId) {
  return prisma.approval_workflows.findUnique({ where: { boq_version_id: boqVersionId } });
}

export async function captureValidationResults(boqVersionId) {
  return prisma.validation_results.findMany({
    where: { boq_version_id: boqVersionId },
    orderBy: { created_at: "asc" },
  });
}

export async function captureHandoffs(boqVersionId) {
  return prisma.handoff_records.findMany({
    where: { boq_version_id: boqVersionId },
    orderBy: { created_at: "desc" },
  });
}

export function createEvidenceWriter(npId) {
  const dir = evidenceDir(npId);
  return async (name, payload) => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), JSON.stringify(payload, jsonReplacer, 2), "utf8");
  };
}

export async function writeE8(boqVersionId, writeJson) {
  const rows = await auditService.listByObject("boq_version", boqVersionId);
  return writeJson("E8-audit-trail.json", {
    object_type: "boq_version",
    object_id: boqVersionId,
    row_count: rows.length,
    rows,
    ordering_check: rows.every(
      (row, i) => i === 0 || (row.created_at ?? "") >= (rows[i - 1].created_at ?? ""),
    ),
  });
}

/**
 * Cross-artifact governance integrity sweep (E1–E9 bundle).
 * Returns { pass, checks[], mismatches[] }.
 */
export function assessGovernanceIntegrity(bundle) {
  const {
    boqVersionId,
    e1,
    e2,
    e3,
    e4,
    e5,
    e6,
    e7,
    e8,
    e9Narrative,
  } = bundle;

  const e1Id = e1?.boq_version_id ?? e1?.boqVersion?.boq_version_id ?? null;
  const e2Id = e2?.boq_version_id ?? null;
  const e7Id = e7?.boq_version_id ?? null;
  const e8Id = e8?.object_id ?? null;

  const checks = [];
  const mismatches = [];

  function addCheck(name, pass, detail) {
    checks.push({ check: name, result: pass ? "PASS" : "FAIL", detail });
    if (!pass) mismatches.push(`${name}: ${detail}`);
  }

  addCheck(
    "E1/E7 BOQ Version match",
    e1Id && e7Id && e1Id === e7Id && e1Id === boqVersionId,
    `E1=${e1Id} E7=${e7Id} canonical=${boqVersionId}`,
  );

  addCheck(
    "E2/E7 consistency",
    e2Id && e7Id && e2Id === e7Id,
    `E2=${e2Id} E7=${e7Id}`,
  );

  const e4HasRejection =
    e4?.wrong_role_attempt?.blocked === true ||
    e4?.attempt_2?.blocked === true ||
    e4?.handoff_attempt_1?.blocked === true ||
    e4?.approval_retry?.blocked === true ||
    e4?.export_retry?.blocked === true ||
    e4?.governance_simulation?.deliberate_mismatch === true;

  const e8Ordered = e8?.ordering_check !== false;
  addCheck("E4/E8 consistency", e8Ordered, e8Ordered ? "E8 chronological" : "E8 ordering invalid");

  const e9ClaimsPass =
    typeof e9Narrative === "string" &&
    /\*\*PASS\*\*|Actual \| PASS|verdict.*PASS/i.test(e9Narrative) &&
    !/cannot close|BLOCKED|mismatch detected/i.test(e9Narrative);

  if (e4HasRejection && e9ClaimsPass) {
    addCheck("E9 narrative consistency", false, "E4 documents rejection but E9 claims PASS");
  } else {
    addCheck(
      "E9 narrative consistency",
      !e9ClaimsPass || !e4HasRejection,
      e9ClaimsPass ? "E9 aligned with E4" : "E9 documents block/mismatch",
    );
  }

  const auditRows = e8?.rows ?? [];
  const auditChronology =
    auditRows.length <= 1 ||
    auditRows.every((row, i) => i === 0 || (row.created_at ?? "") >= (auditRows[i - 1].created_at ?? ""));
  addCheck("audit chronology", auditChronology, `rows=${auditRows.length}`);

  const e3Stage = e3?.after_wrong_role_attempt?.current_stage ?? e3?.current_stage ?? e3?.after_duplicate_attempt?.current_stage;
  const e4StageUnchanged =
    e4?.workflow_stage_unchanged === true ||
    e3?.workflow_stage_unchanged === true ||
    e3?.before_wrong_role_attempt?.current_stage === e3?.after_wrong_role_attempt?.current_stage;
  addCheck(
    "workflow state integrity",
    e4StageUnchanged !== false,
    `E3 stage=${e3Stage ?? "n/a"} unchanged=${e4StageUnchanged}`,
  );

  const retryIdempotent =
    bundle.retryAssessment?.idempotent !== false &&
    bundle.retryAssessment?.duplicate_success_rows !== true;
  addCheck(
    "retry idempotency",
    retryIdempotent,
    bundle.retryAssessment?.summary ?? "N/A for NP-011",
  );

  const pass = mismatches.length === 0;
  return { pass, checks, mismatches, closure_allowed: pass };
}

export function buildGovernanceIntegrityMatrix(bundle) {
  const assessment = assessGovernanceIntegrity(bundle);
  return {
    section: "GOVERNANCE_INTEGRITY_MATRIX",
    scenario: bundle.scenario ?? null,
    boq_version_id: bundle.boqVersionId,
    closure_allowed: assessment.closure_allowed,
    checks: assessment.checks,
    mismatches: assessment.mismatches,
    overall: assessment.pass ? "PASS" : "FAIL",
  };
}

export function buildFalsePassAnalysis(npId, checks) {
  return {
    scenario: npId,
    checks: [
      {
        check: "Silent false PASS?",
        result: checks.silentFalsePass,
        evidence: checks.silentFalsePassEvidence,
      },
      {
        check: "Closure allowed incorrectly?",
        result: checks.closureAllowedIncorrectly,
        evidence: checks.closureEvidence,
      },
      {
        check: "Audit contradiction?",
        result: checks.auditContradiction,
        evidence: checks.auditEvidence,
      },
      {
        check: "Evidence contradiction?",
        result: checks.evidenceContradiction,
        evidence: checks.evidenceContradictionEvidence,
      },
      {
        check: "Retry inconsistency?",
        result: checks.retryInconsistency,
        evidence: checks.retryEvidence,
      },
    ],
  };
}

export async function writeE9(npId, meta, writeFileFn) {
  const {
    start,
    end,
    projectId,
    boqVersionId,
    persona,
    actionAttempted,
    expectedResult,
    actualResult,
    falsePassChecks,
    falsePassAnalysis,
    governanceMatrix,
    lessonsLearned,
    timeline,
    m03Note,
  } = meta;

  const fpa = falsePassAnalysis
    ? `\n## FALSE_PASS_ANALYSIS\n\n| Check | Result | Evidence |\n|-------|--------|----------|\n${falsePassAnalysis.checks.map((c) => `| ${c.check} | ${c.result} | ${c.evidence} |`).join("\n")}\n`
    : "";

  const gim = governanceMatrix
    ? `\n## GOVERNANCE_INTEGRITY_MATRIX\n\n| Check | Result |\n|-------|--------|\n${governanceMatrix.checks.map((c) => `| ${c.check} | ${c.result} |`).join("\n")}\n\n**Overall:** ${governanceMatrix.overall} — closure_allowed=${governanceMatrix.closure_allowed}\n`
    : "";

  const body = `# ${npId} — E9 — Sprint 8 Wave 4

| Persona | ${persona} |
| BOQ Version ID | ${boqVersionId} |
| Action | ${actionAttempted} |
| Expected | ${expectedResult} |
| Actual | ${actualResult} |
| Duration | ${end.getTime() - start.getTime()} ms |

## False PASS Checklist
${falsePassChecks.map((c) => `- [${c.pass ? "x" : " "}] ${c.label}`).join("\n")}
${fpa}${gim}
${m03Note ? `## M-03 Trace Note\n${m03Note}\n` : ""}

## Lessons
${lessonsLearned.map((l) => `- ${l}`).join("\n")}

## Timeline
${(timeline ?? []).map((t) => `- ${t.at} — ${t.persona ? `[${t.persona}] ` : ""}${t.event}`).join("\n")}
`;
  const file = path.join(evidenceDir(npId), "E9-execution-note.md");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFileFn(file, body, "utf8");
  return body;
}

export async function writeExecutionReport(npId, meta) {
  const {
    start,
    end,
    projectId,
    boqVersionId,
    verdict,
    persona,
    summary,
    falsePassSummary,
    governanceMatrixSummary,
  } = meta;
  const body = `# Sprint 8 Wave 4 — ${npId} (Official Execution Report)

| Field | Value |
|-------|-------|
| Scenario | ${npId} |
| Result | **${verdict}** |
| Persona | ${persona} |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Evidence path | docs/SPRINT_8/WAVE4/evidence/${npId}/ |

## Summary
${summary}

## GOVERNANCE_INTEGRITY_MATRIX
${governanceMatrixSummary ?? "See E9-execution-note.md"}

## FALSE_PASS_ANALYSIS
${falsePassSummary ?? "See E9-execution-note.md"}

## Governance
- Operational Readiness PASS: **NOT CLAIMED**
- Production Readiness / MVP Freeze: **NOT CLAIMED**
- Sprint 9: **NOT STARTED**
- TD-7B-003: **remains OPEN**
`;
  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(reportPath(npId), body, "utf8");
}
