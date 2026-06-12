/**
 * Sprint 8 Wave 1 — shared evidence helpers for NP-001 / NP-002 / NP-008
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../src/lib/db/prisma.ts";
import { auditService } from "../../src/lib/services/audit.service.ts";
import { AppError } from "../../src/lib/utils/errors.ts";
import {
  deriveReadinessTier,
  deriveValidationStatus,
  inferValidationRun,
} from "../../src/lib/validations/readiness.ts";

export const WAVE1_ROOT = path.resolve("docs/SPRINT_8/WAVE1");
export const REPORT_ROOT = path.join(WAVE1_ROOT, "EXECUTION_REPORT");

/** Sprint 7 + PRE_GATE canonical IDs — must not appear in S8 Wave 1 E1 */
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

export function evidenceDir(npId) {
  return path.join(WAVE1_ROOT, "evidence", npId);
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

export function assertBoqVersionId(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: BOQ Version ID mismatch (expected ${expected}, got ${actual})`);
  }
}

export function assertNoContamination(boqVersionId) {
  if (CLOSED_SIM_BOQ_IDS.includes(boqVersionId)) {
    throw new Error(
      `BOQ Version ID contamination: ${boqVersionId} matches closed Sprint 7 SIM namespace`,
    );
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

export function countOpenBlocks(results) {
  return results.filter(
    (r) =>
      r.severity === "BLOCK" &&
      !r.resolved_flag &&
      r.result_status !== "Pass" &&
      r.result_status !== "Overridden",
  ).length;
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

export function buildReadinessSnapshot(gate, results, version = {}) {
  const summary = buildValidationSummary(gate, results, version);
  const tier = deriveReadinessTier({
    validation_run: summary.validation_run,
    unresolved_block_count: gate.unresolved_block_count,
    open_warning_count: 0,
    can_approve: gate.can_approve,
  });
  return { tier, ...summary, gate };
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

export async function captureSeedPayload(projectId, boqVersionId) {
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

export async function captureWorkflow(boqVersionId) {
  return prisma.approval_workflows.findUnique({
    where: { boq_version_id: boqVersionId },
  });
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
  return async function writeJson(name, payload) {
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, name);
    await writeFile(file, JSON.stringify(payload, jsonReplacer, 2), "utf8");
    return file;
  };
}

export async function writeE8(boqVersionId, writeJson) {
  const auditRows = await auditService.listByObject("boq_version", boqVersionId);
  return writeJson("E8-audit-trail.json", {
    object_type: "boq_version",
    object_id: boqVersionId,
    row_count: auditRows.length,
    rows: auditRows,
    m03_note:
      "Rejected API attempts may not appear in audit_logs — compare E4 vs E8 in E9.",
  });
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
    lessonsLearned,
    timeline,
    stepResults,
    extraFields = {},
  } = meta;

  const durationMs = end.getTime() - start.getTime();
  const checks = falsePassChecks
    .map((c) => `- [${c.pass ? "x" : " "}] ${c.label}${c.note ? ` — ${c.note}` : ""}`)
    .join("\n");

  const body = `# ${npId} — Co-worker Execution Note (E9) — Sprint 8 Wave 1 OFFICIAL

| Field | Value |
|-------|-------|
| Sprint | 8-3 — Wave 1 Co-worker Simulation |
| Scenario | ${npId} |
| Persona | ${persona} |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Duration | ${durationMs} ms |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Operational Readiness PASS | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Production Readiness | **NOT CLAIMED** |

${Object.entries(extraFields)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

## Persona Action

| Field | Value |
|-------|-------|
| Persona | ${persona} |
| Action attempted | ${actionAttempted} |
| Expected result | ${expectedResult} |
| Actual result | ${actualResult} |

## False PASS Check

${checks}

## Lessons Learned

${lessonsLearned.map((l) => `- ${l}`).join("\n")}

## Timeline

${timeline.map((t) => `- ${t.at} — ${t.event}`).join("\n")}

## Step Results

${stepResults
  .map(
    (s) =>
      `- [${s.status}] ${s.step}\n  ${JSON.stringify({ ...s, status: undefined, step: undefined })}`,
  )
  .join("\n")}

## Carry-over Notes

- M-03: Rejected attempts captured in E4; E8 may under-represent rejections.
- M-07: requestId/traceId not on AppError — BOQ Version ID + timestamp used.
- No PRE_GATE_DIAGNOSTIC artifact reuse.
- No Sprint 7 SIM BOQ Version ID contamination.

`;

  const file = path.join(evidenceDir(npId), "E9-execution-note.md");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFileFn(file, body, "utf8");
  return file;
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
    evidenceLinks,
  } = meta;
  const durationMs = end.getTime() - start.getTime();
  const body = `# Sprint 8 Wave 1 — ${npId} (Official Execution Report)

| Field | Value |
|-------|-------|
| Scenario | ${npId} |
| Wave | 1 — Authority & validation foundation |
| Run type | **Official Sprint 8-3 co-worker simulation** |
| Result | **${verdict}** |
| Persona | ${persona} |
| Started at | ${start.toISOString()} |
| Finished at | ${end.toISOString()} |
| Duration | ${durationMs} ms |
| Project ID | ${projectId} |
| BOQ Version ID | ${boqVersionId} |
| Evidence path | docs/SPRINT_8/WAVE1/evidence/${npId}/ |

## Summary

${summary}

## Evidence Links

${evidenceLinks.map((l) => `- ${l}`).join("\n")}

## Governance

- Operational Readiness PASS: **NOT CLAIMED**
- Wave 2/3/4 execution: **NOT AUTHORIZED** by this run
- Stop-on-fail: enforced

`;

  await mkdir(REPORT_ROOT, { recursive: true });
  const file = reportPath(npId);
  await writeFile(file, body, "utf8");
  return file;
}
