/**
 * Sprint 8 Wave 3 — shared evidence helpers (NP-009 / NP-012)
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../src/lib/db/prisma.ts";
import { auditService } from "../../src/lib/services/audit.service.ts";
import { boqLineService } from "../../src/lib/services/boq-line.service.ts";
import { AppError } from "../../src/lib/utils/errors.ts";
import { countOpenWarnings } from "../../src/lib/validations/validation-findings.ts";
import {
  deriveReadinessTier,
  deriveValidationStatus,
  inferValidationRun,
} from "../../src/lib/validations/readiness.ts";

export const WAVE3_ROOT = path.resolve("docs/SPRINT_8/WAVE3");
export const REPORT_ROOT = path.join(WAVE3_ROOT, "EXECUTION_REPORT");
export const E0_ROOT = path.join(WAVE3_ROOT, "evidence/E0-pre-run-baseline");

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

export function evidenceDir(npId) {
  return path.join(WAVE3_ROOT, "evidence", npId);
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

export function openBlockRuleCodes(results) {
  return [
    ...new Set(
      results
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

export function hashBoqLinePayload(lines) {
  const canonical = lines
    .map((l) =>
      [
        l.boq_line_id,
        l.line_no,
        l.item_description,
        l.is_critical_line,
        l.cost_layer_total,
        l.updated_at,
      ].join("|"),
    )
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export async function assessStaleValidation(boqVersionId, validationResults, gate = null) {
  const lines = await boqLineService.listByBoqVersion(boqVersionId);
  const liveCriticalFailures = await boqLineService.findCriticalLineValidationFailures(
    boqVersionId,
  );
  const maxLineUpdatedAt = lines.reduce(
    (max, l) => (l.updated_at > max ? l.updated_at : max),
    "",
  );
  const maxValidationCreatedAt = validationResults.reduce((max, r) => {
    const ts = r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? "");
    return ts > max ? ts : max;
  }, "");

  const approvalBlocksPersisted =
    gate?.unresolved_approval_block_count ??
    openBlockRuleCodes(validationResults).filter((c) => c !== "HANDOFF_WITHOUT_LOCK").length;

  const staleByTimestamp =
    Boolean(maxLineUpdatedAt) &&
    Boolean(maxValidationCreatedAt) &&
    maxLineUpdatedAt > maxValidationCreatedAt;
  const staleByLiveMismatch = liveCriticalFailures.length > 0 && approvalBlocksPersisted === 0;

  return {
    max_line_updated_at: maxLineUpdatedAt || null,
    max_validation_created_at: maxValidationCreatedAt || null,
    stale_by_timestamp: staleByTimestamp,
    stale_by_live_mismatch: staleByLiveMismatch,
    stale_detected: staleByTimestamp || staleByLiveMismatch,
    live_critical_failure_count: liveCriticalFailures.length,
    live_critical_line_ids: liveCriticalFailures.map((l) => l.boq_line_id),
    persisted_approval_block_count: approvalBlocksPersisted,
    e1_line_payload_hash: hashBoqLinePayload(lines),
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

export function buildFalsePassAnalysis(npId, checks) {
  return {
    scenario: npId,
    checks: [
      { check: "Stale state observed?", result: checks.staleObserved, evidence: checks.staleEvidence },
      { check: "Silent false PASS observed?", result: checks.silentFalsePass, evidence: checks.silentFalsePassEvidence },
      { check: "Approval inconsistency?", result: checks.approvalInconsistency, evidence: checks.approvalEvidence },
      { check: "Export inconsistency?", result: checks.exportInconsistency, evidence: checks.exportEvidence },
      { check: "Audit inconsistency?", result: checks.auditInconsistency, evidence: checks.auditEvidence },
      { check: "Workflow inconsistency?", result: checks.workflowInconsistency, evidence: checks.workflowEvidence },
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
    lessonsLearned,
    timeline,
    m07Note,
  } = meta;

  const fpa = falsePassAnalysis
    ? `\n## FALSE_PASS_ANALYSIS\n\n| Check | Result | Evidence |\n|-------|--------|----------|\n${falsePassAnalysis.checks.map((c) => `| ${c.check} | ${c.result} | ${c.evidence} |`).join("\n")}\n`
    : "";

  const body = `# ${npId} — E9 — Sprint 8 Wave 3

| Persona | ${persona} |
| BOQ Version ID | ${boqVersionId} |
| Action | ${actionAttempted} |
| Expected | ${expectedResult} |
| Actual | ${actualResult} |
| Duration | ${end.getTime() - start.getTime()} ms |

## False PASS Checklist
${falsePassChecks.map((c) => `- [${c.pass ? "x" : " "}] ${c.label}`).join("\n")}
${fpa}
${m07Note ? `## M-07 Trace Note\n${m07Note}\n` : ""}

## Lessons
${lessonsLearned.map((l) => `- ${l}`).join("\n")}

## Timeline
${(timeline ?? []).map((t) => `- ${t.at} — ${t.persona ? `[${t.persona}] ` : ""}${t.event}`).join("\n")}
`;
  const file = path.join(evidenceDir(npId), "E9-execution-note.md");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFileFn(file, body, "utf8");
}

export async function writeExecutionReport(npId, meta) {
  const { start, end, projectId, boqVersionId, verdict, persona, summary, falsePassSummary } = meta;
  const body = `# Sprint 8 Wave 3 — ${npId} (Official Execution Report)

| Field | Value |
|-------|-------|
| Scenario | ${npId} |
| Result | **${verdict}** |
| Persona | ${persona} |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Evidence path | docs/SPRINT_8/WAVE3/evidence/${npId}/ |

## Summary
${summary}

## FALSE_PASS_ANALYSIS
${falsePassSummary ?? "See E9-execution-note.md"}

## Governance
- Operational Readiness PASS: **NOT CLAIMED**
- Production Readiness / MVP Freeze: **NOT CLAIMED**
- Wave 4: **NOT AUTHORIZED**
- TD-7B-003: **remains OPEN** unless separate evidence proves closure
`;
  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(reportPath(npId), body, "utf8");
}

export function verifyE2E3E6E7Consistency(ctx) {
  const issues = [];
  if (ctx.e2Timestamp && ctx.decisionTimestamp && ctx.e2Timestamp > ctx.decisionTimestamp) {
    issues.push("E2 timestamp after approval/export decision");
  }
  if (ctx.e3Stage && ctx.e7WorkflowStatus && ctx.e3Stage !== ctx.e7WorkflowStatus) {
    issues.push(`E3 stage ${ctx.e3Stage} != E7 workflow ${ctx.e7WorkflowStatus}`);
  }
  if (ctx.e6Tier && ctx.e7ReadinessTier && ctx.e6Tier !== ctx.e7ReadinessTier) {
    issues.push(`E6 tier ${ctx.e6Tier} != E7 readiness ${ctx.e7ReadinessTier}`);
  }
  if (ctx.e6Tier === "Ready" && ctx.liveBlockCount > 0) {
    issues.push("E6 Ready while live blocks exist");
  }
  return { consistent: issues.length === 0, issues };
}
