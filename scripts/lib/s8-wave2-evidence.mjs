/**
 * Sprint 8 Wave 2 — shared evidence helpers (NP-003..NP-007)
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

export const WAVE2_ROOT = path.resolve("docs/SPRINT_8/WAVE2");
export const REPORT_ROOT = path.join(WAVE2_ROOT, "EXECUTION_REPORT");
export const E0_ROOT = path.join(WAVE2_ROOT, "evidence/E0-pre-run-baseline");

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

export function evidenceDir(npId) {
  return path.join(WAVE2_ROOT, "evidence", npId);
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
}

export function captureAppError(err) {
  if (err instanceof AppError) {
    return { blocked: true, code: err.code, status: err.status, message: err.message, timestamp: new Date().toISOString() };
  }
  return { blocked: false, unexpected: true, message: err instanceof Error ? err.message : String(err) };
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
  return [...new Set(results.filter((r) => r.severity === "BLOCK" && !r.resolved_flag && r.result_status !== "Pass" && r.result_status !== "Overridden").map((r) => r.rule_code))];
}

export function openWarningRuleCodes(results) {
  return [...new Set(results.filter((r) => r.severity === "WARNING" && !r.resolved_flag && r.result_status !== "Pass" && r.result_status !== "Overridden").map((r) => r.rule_code))];
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

export function buildTd7b003Assessment(ctx) {
  const confirmsKnownGap = ctx.e6Tier === "Ready" && ctx.e6UnresolvedBlocks === 0 && ctx.handoffBlocked && ctx.exportSucceeded;
  return {
    debt_id: "TD-7B-003",
    title: "Handoff readiness / export gate alignment",
    scenario: ctx.scenario,
    expected_behavior: "Readiness/export reflect handoff completeness OR document layer separation",
    actual_behavior: {
      e6_readiness_tier: ctx.e6Tier,
      e6_unresolved_blocks: ctx.e6UnresolvedBlocks,
      handoff_blocked: ctx.handoffBlocked,
      handoff_block_code: ctx.handoffBlockCode ?? null,
      handoff_record_count: ctx.handoffRecordCount,
      export_blocked: ctx.exportBlocked,
      export_block_code: ctx.exportBlockCode ?? null,
      export_succeeded: ctx.exportSucceeded,
    },
    confirms_or_contradicts_td_7b_003: confirmsKnownGap
      ? "CONFIRMS — export may proceed while handoff layer blocks (TD-7B-003 remains open)"
      : ctx.exportBlocked && ctx.handoffBlocked
        ? "CONFIRMS — both layers block"
        : "NEUTRAL",
    td_7b_003_closed: false,
    note: "Evidence only — do not silently close TD-7B-003",
  };
}

export async function captureSeedPayload(projectId, boqVersionId) {
  const [project, boqVersion, designBasis, documents, boqDocLinks, projectDisciplines, boqLines, boqSummary] = await Promise.all([
    prisma.projects.findUniqueOrThrow({ where: { project_id: projectId } }),
    prisma.boq_versions.findUniqueOrThrow({ where: { boq_version_id: boqVersionId } }),
    prisma.design_basis_versions.findMany({ where: { project_id: projectId }, orderBy: { design_version_no: "desc" } }),
    prisma.documents.findMany({ where: { project_id: projectId } }),
    prisma.boq_version_documents.findMany({ where: { boq_version_id: boqVersionId } }),
    prisma.project_disciplines.findMany({ where: { boq_version_id: boqVersionId }, include: { discipline: true } }),
    prisma.boq_lines.findMany({ where: { boq_version_id: boqVersionId }, include: { boq_cost_breakdowns: true }, orderBy: { line_no: "asc" } }),
    prisma.boq_summary.findUnique({ where: { boq_version_id: boqVersionId } }),
  ]);
  return { project, boqVersion, designBasis, documents, boqDocLinks, projectDisciplines, boqLines, boqSummary };
}

export async function captureWorkflow(boqVersionId) {
  return prisma.approval_workflows.findUnique({ where: { boq_version_id: boqVersionId } });
}

export async function captureValidationResults(boqVersionId) {
  return prisma.validation_results.findMany({ where: { boq_version_id: boqVersionId }, orderBy: { created_at: "asc" } });
}

export async function captureHandoffs(boqVersionId) {
  return prisma.handoff_records.findMany({ where: { boq_version_id: boqVersionId }, orderBy: { created_at: "desc" } });
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
  return writeJson("E8-audit-trail.json", { object_type: "boq_version", object_id: boqVersionId, row_count: rows.length, rows });
}

export async function writeE9(npId, meta, writeFileFn) {
  const { start, end, projectId, boqVersionId, persona, actionAttempted, expectedResult, actualResult, falsePassChecks, lessonsLearned, timeline, td7b003 } = meta;
  const body = `# ${npId} — E9 — Sprint 8 Wave 2

| Persona | ${persona} |
| BOQ Version ID | ${boqVersionId} |
| Action | ${actionAttempted} |
| Expected | ${expectedResult} |
| Actual | ${actualResult} |
| Duration | ${end.getTime() - start.getTime()} ms |

## False PASS
${falsePassChecks.map((c) => `- [${c.pass ? "x" : " "}] ${c.label}`).join("\n")}

${td7b003 ? `## TD-7B-003\n${td7b003.confirms_or_contradicts_td_7b_003}\n` : ""}

## Lessons
${lessonsLearned.map((l) => `- ${l}`).join("\n")}

## Timeline
${(timeline ?? []).map((t) => `- ${t.at} — ${t.event}`).join("\n")}
`;
  const file = path.join(evidenceDir(npId), "E9-execution-note.md");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFileFn(file, body, "utf8");
}

export async function writeExecutionReport(npId, meta) {
  const { start, end, projectId, boqVersionId, verdict, persona, summary, td7b003Note } = meta;
  const body = `# Sprint 8 Wave 2 — ${npId} (Official Execution Report)

| Field | Value |
|-------|-------|
| Scenario | ${npId} |
| Result | **${verdict}** |
| Persona | ${persona} |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Evidence path | docs/SPRINT_8/WAVE2/evidence/${npId}/ |

## Summary
${summary}

${td7b003Note ? `## TD-7B-003\n\n${td7b003Note}\n` : ""}

## Governance
- Operational Readiness PASS: **NOT CLAIMED**
- Wave 3/4: **NOT AUTHORIZED**
`;
  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(reportPath(npId), body, "utf8");
}
