import type { BoqSummaryView } from "@/lib/services/boq-summary.service";
import type { BoqDocumentLinkRow } from "@/lib/services/document.service";
import type { ProjectDisciplineRow } from "@/lib/services/discipline.service";
import type { ValidationResultRow } from "@/lib/services/validation.service";
import { isUnresolvedBlock } from "@/lib/services/validation.service";

/** Single source of truth — Sprint 6D report completeness rule codes */
export const REPORT_VALIDATION_CODES = [
  "REPORT_PROJECT_INCOMPLETE",
  "REPORT_DOCUMENT_INCOMPLETE",
  "REPORT_DISCIPLINE_INCOMPLETE",
  "REPORT_COST_INCOMPLETE",
  "REPORT_VALIDATION_INCOMPLETE",
  "REPORT_EXPORT_NOT_READY",
] as const;

export type ReportValidationCode = (typeof REPORT_VALIDATION_CODES)[number];

export type ReportProjectSection = {
  project_id: string;
  project_name: string;
  location: string | null;
  it_load_kw: number;
  rack_count: number;
  currency: string;
};

export type ReportDocumentSection = {
  links: BoqDocumentLinkRow[];
  required_count: number;
  satisfied_count: number;
};

export type ReportDisciplineSection = {
  rows: ProjectDisciplineRow[];
  included_count: number;
};

export type ReportValidationSection = {
  results: ValidationResultRow[];
  unresolved_block_count: number;
  validation_run: boolean;
};

export type BoqConsolidatedReport = {
  project: ReportProjectSection | null;
  document: ReportDocumentSection | null;
  discipline: ReportDisciplineSection | null;
  cost: BoqSummaryView | null;
  validation: ReportValidationSection | null;
};

export type ReportValidationIssue = {
  code: ReportValidationCode;
  message: string;
};

export type ReportValidationResult = {
  is_complete: boolean;
  is_export_ready: boolean;
  issues: ReportValidationIssue[];
  passed_codes: ReportValidationCode[];
};

function issue(code: ReportValidationCode, message: string): ReportValidationIssue {
  return { code, message };
}

export function validateProjectSummary(
  project: ReportProjectSection | null,
): ReportValidationIssue | null {
  if (!project) {
    return issue(
      "REPORT_PROJECT_INCOMPLETE",
      "ไม่พบข้อมูลโปรเจกต์สำหรับรายงาน",
    );
  }
  if (!project.project_name?.trim()) {
    return issue("REPORT_PROJECT_INCOMPLETE", "ชื่อโปรเจกต์ว่าง");
  }
  if (!project.location?.trim()) {
    return issue("REPORT_PROJECT_INCOMPLETE", "ยังไม่ระบุ location");
  }
  if (project.it_load_kw <= 0) {
    return issue("REPORT_PROJECT_INCOMPLETE", "IT load ต้องมากกว่า 0");
  }
  if (project.rack_count <= 0) {
    return issue("REPORT_PROJECT_INCOMPLETE", "Rack count ต้องมากกว่า 0");
  }
  return null;
}

export function validateDocumentSummary(
  section: ReportDocumentSection | null,
): ReportValidationIssue | null {
  if (!section || section.links.length === 0) {
    return issue(
      "REPORT_DOCUMENT_INCOMPLETE",
      "ยังไม่มีเอกสารลิงก์กับ BOQ version",
    );
  }
  if (section.required_count > 0 && section.satisfied_count < section.required_count) {
    return issue(
      "REPORT_DOCUMENT_INCOMPLETE",
      `เอกสาร required ยังไม่ครบ (${section.satisfied_count}/${section.required_count})`,
    );
  }
  return null;
}

export function validateDisciplineSummary(
  section: ReportDisciplineSection | null,
): ReportValidationIssue | null {
  if (!section || section.included_count === 0) {
    return issue(
      "REPORT_DISCIPLINE_INCOMPLETE",
      "ยังไม่มีสาขาที่เลือก Included ใน BOQ",
    );
  }
  return null;
}

export function validateCostSummary(
  cost: BoqSummaryView | null,
): ReportValidationIssue | null {
  if (!cost) {
    return issue("REPORT_COST_INCOMPLETE", "ยังไม่มี BOQ summary — ต้อง roll-up ต้นทุนก่อน");
  }
  if (cost.breakdown_line_count === 0) {
    return issue(
      "REPORT_COST_INCOMPLETE",
      "ยังไม่มี cost layers สำหรับ roll-up",
    );
  }
  if (cost.subtotal_before_margin <= 0) {
    return issue("REPORT_COST_INCOMPLETE", "Subtotal ก่อน margin ต้องมากกว่า 0");
  }
  return null;
}

export function validateValidationSummary(
  section: ReportValidationSection | null,
): ReportValidationIssue | null {
  if (!section || !section.validation_run) {
    return issue(
      "REPORT_VALIDATION_INCOMPLETE",
      "ยังไม่ได้รัน validation engine สำหรับ BOQ version นี้",
    );
  }
  if (section.unresolved_block_count > 0) {
    return issue(
      "REPORT_VALIDATION_INCOMPLETE",
      `มี unresolved BLOCK ${section.unresolved_block_count} รายการ`,
    );
  }
  return null;
}

export function validateExportReady(
  sectionIssues: ReportValidationIssue[],
): ReportValidationIssue | null {
  if (sectionIssues.length > 0) {
    return issue(
      "REPORT_EXPORT_NOT_READY",
      "รายงานยังไม่พร้อม export — แก้ไข validation issues ก่อน",
    );
  }
  return null;
}

/** Run all six reporting validation rules against a consolidated report DTO */
export function validateReportCompleteness(
  report: BoqConsolidatedReport,
): ReportValidationResult {
  const sectionChecks: {
    code: Exclude<ReportValidationCode, "REPORT_EXPORT_NOT_READY">;
    issue: ReportValidationIssue | null;
  }[] = [
    {
      code: "REPORT_PROJECT_INCOMPLETE",
      issue: validateProjectSummary(report.project),
    },
    {
      code: "REPORT_DOCUMENT_INCOMPLETE",
      issue: validateDocumentSummary(report.document),
    },
    {
      code: "REPORT_DISCIPLINE_INCOMPLETE",
      issue: validateDisciplineSummary(report.discipline),
    },
    { code: "REPORT_COST_INCOMPLETE", issue: validateCostSummary(report.cost) },
    {
      code: "REPORT_VALIDATION_INCOMPLETE",
      issue: validateValidationSummary(report.validation),
    },
  ];

  const issues: ReportValidationIssue[] = [];
  const passed_codes: ReportValidationCode[] = [];

  for (const check of sectionChecks) {
    if (check.issue) {
      issues.push(check.issue);
    } else {
      passed_codes.push(check.code);
    }
  }

  const exportIssue = validateExportReady(issues);
  if (exportIssue) {
    issues.push(exportIssue);
  } else {
    passed_codes.push("REPORT_EXPORT_NOT_READY");
  }

  return {
    is_complete: issues.length === 0,
    is_export_ready: !exportIssue,
    issues,
    passed_codes,
  };
}

/** Count unresolved blocks from validation result rows */
export function countUnresolvedBlocks(results: ValidationResultRow[]): number {
  return results.filter((r) =>
    isUnresolvedBlock({
      severity: r.severity,
      resolved_flag: r.resolved_flag,
      result_status: r.result_status,
    }),
  ).length;
}

/** Reporting Governance facing rule codes (GOV_*) — 1:1 alias of REPORT_* engine codes. */
export const GOV_REPORTING_RULE_CODES = [
  "GOV_REPORT_PROJECT",
  "GOV_REPORT_DOCUMENT",
  "GOV_REPORT_DISCIPLINE",
  "GOV_REPORT_COST",
  "GOV_REPORT_VALIDATION",
  "GOV_REPORT_EXPORT",
] as const;

export type GovReportingRuleCode = (typeof GOV_REPORTING_RULE_CODES)[number];

/** SSOT mapping: engine REPORT_* code -> governance GOV_* code. */
export const REPORT_TO_GOV: Record<ReportValidationCode, GovReportingRuleCode> = {
  REPORT_PROJECT_INCOMPLETE: "GOV_REPORT_PROJECT",
  REPORT_DOCUMENT_INCOMPLETE: "GOV_REPORT_DOCUMENT",
  REPORT_DISCIPLINE_INCOMPLETE: "GOV_REPORT_DISCIPLINE",
  REPORT_COST_INCOMPLETE: "GOV_REPORT_COST",
  REPORT_VALIDATION_INCOMPLETE: "GOV_REPORT_VALIDATION",
  REPORT_EXPORT_NOT_READY: "GOV_REPORT_EXPORT",
};

export function toGovCode(code: ReportValidationCode): GovReportingRuleCode {
  return REPORT_TO_GOV[code];
}

/** Export BLOCK gate predicate — SSOT for "ห้าม export เมื่อมี unresolved BLOCK". */
export function isReportExportBlocked(unresolvedBlockCount: number): boolean {
  return unresolvedBlockCount > 0;
}
