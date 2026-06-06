import { prisma } from "@/lib/db/prisma";
import { approvalService } from "@/lib/services/approval.service";
import { boqSummaryService, type BoqSummaryView } from "@/lib/services/boq-summary.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { disciplineService } from "@/lib/services/discipline.service";
import { documentService } from "@/lib/services/document.service";
import {
  validationService,
  type ValidationResultRow,
} from "@/lib/services/validation.service";
import type { BoqConsolidatedReport } from "@/lib/validations/reporting";
import {
  deriveReadinessTier,
  type ReadinessTier,
} from "@/lib/validations/readiness";

export type BoqSummaryReportProject = {
  project_name: string;
  boq_version_no: number;
  workflow_status: string;
  approval_status: string;
  lock_status: string;
  handoff_status: string;
};

export type BoqSummaryReportDocument = {
  total_documents: number;
  required_documents: number;
  missing_documents: number;
  document_validation_status: string;
};

export type BoqSummaryReportDiscipline = {
  included_disciplines: string[];
  excluded_disciplines: string[];
  blocked_disciplines: string[];
  risk_summary: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
};

export type BoqSummaryReportCost = {
  material_total: number;
  labor_total: number;
  logistics_total: number;
  testing_total: number;
  documentation_total: number;
  indirect_total: number;
  risk_total: number;
  overhead_total: number;
  subtotal: number;
  grand_total: number;
  currency: string;
};

export type BoqSummaryReportValidation = {
  validation_status: string;
  total_validation_rules: number;
  total_results: number;
  warning_count: number;
  block_count: number;
  unresolved_blocks: number;
  open_warning_count: number;
  ready_status: ReadinessTier;
  can_approve: boolean;
  can_handoff: boolean;
  block_reason: string | null;
  results: ValidationResultRow[];
};

export type BoqSummaryReport = {
  boq_version_id: string;
  project_id: string;
  generated_at: string;
  project: BoqSummaryReportProject;
  document: BoqSummaryReportDocument;
  discipline: BoqSummaryReportDiscipline;
  cost: BoqSummaryReportCost;
  validation: BoqSummaryReportValidation;
  summary: BoqSummaryView;
};

function formatApprovalStatus(
  workflow: Awaited<ReturnType<typeof approvalService.getPageData>> extends infer T
    ? T extends { workflow: infer W }
      ? W
      : never
    : never,
): string {
  if (!workflow) return "Not started";
  if (workflow.workflow_status === "Completed") {
    return `Completed (${workflow.current_stage ?? "Final Lock"})`;
  }
  return workflow.current_stage ?? workflow.workflow_status;
}

function formatHandoffStatus(
  records: { handoff_status: string; handoff_at: Date | null }[],
): string {
  if (records.length === 0) return "Not handed off";
  const latest = records[0];
  if (!latest) return "Not handed off";
  const at = latest.handoff_at
    ? new Date(latest.handoff_at).toLocaleString("th-TH")
    : "";
  return `${latest.handoff_status}${at ? ` · ${at}` : ""}`;
}

function buildRiskSummary(
  disciplines: Awaited<ReturnType<typeof disciplineService.getProjectDisciplines>>,
) {
  const included = disciplines.filter((d) => d.included_flag);
  return {
    low: included.filter((d) => d.risk_level === "Low").length,
    medium: included.filter((d) => d.risk_level === "Medium").length,
    high: included.filter((d) => d.risk_level === "High").length,
    critical: included.filter((d) => d.risk_level === "Critical").length,
  };
}

function countOpenWarnings(results: ValidationResultRow[]): number {
  return results.filter(
    (r) =>
      r.severity === "WARNING" &&
      !r.resolved_flag &&
      r.result_status !== "Pass" &&
      r.result_status !== "Overridden",
  ).length;
}

function buildCostSummary(
  summary: BoqSummaryView,
  currency: string,
): BoqSummaryReportCost {
  return {
    material_total: summary.total_material_cost,
    labor_total: summary.total_labor_cost,
    logistics_total: summary.total_logistics_cost,
    testing_total: summary.total_testing_cost,
    documentation_total: summary.total_documentation_cost,
    indirect_total: summary.total_indirect_cost,
    risk_total: summary.total_risk_cost,
    overhead_total: summary.total_overhead_cost,
    subtotal: summary.subtotal_before_margin,
    grand_total: summary.selling_price,
    currency,
  };
}

export const boqSummaryReportService = {
  async getBoqSummaryReport(
    projectId: string,
    boqVersionId: string,
  ): Promise<BoqSummaryReport | null> {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) return null;

    let { summary } = await boqSummaryService.getSummaryForVersion(boqVersionId);
    if (!summary) {
      summary = (await boqSummaryService.refreshSummary(boqVersionId)).summary;
    }

    const [
      approvalPage,
      docLinks,
      projectDocs,
      disciplines,
      includedWithoutLines,
      missingRequiredDocs,
      validationResults,
      validationGate,
      latestHandoffs,
      activeRuleCount,
    ] = await Promise.all([
      approvalService.getPageData(projectId, boqVersionId),
      documentService.listBoqDocumentLinks(boqVersionId),
      documentService.listProjectDocuments(projectId),
      disciplineService.getProjectDisciplines(projectId, boqVersionId),
      disciplineService.findIncludedWithoutLines(boqVersionId),
      documentService.findMissingRequiredDocs(projectId, boqVersionId),
      validationService.listResultsWithRules(boqVersionId),
      validationService.getWorkflowGate(boqVersionId),
      prisma.handoff_records.findMany({
        where: { boq_version_id: boqVersionId },
        orderBy: { created_at: "desc" },
        take: 1,
      }),
      prisma.validation_rules.count({ where: { is_active: true } }),
    ]);

    const dependencySummary = documentService.getDependencySummary(docLinks);
    const requiredDocuments =
      dependencySummary.required_count || missingRequiredDocs.length;
    const missingDocuments = missingRequiredDocs.length;

    const documentValidationStatus =
      missingDocuments === 0 && dependencySummary.all_required_satisfied
        ? "Pass"
        : missingDocuments > 0
          ? "Fail — missing required documents"
          : dependencySummary.pending_count > 0
            ? "Pending — required dependencies open"
            : "Pass";

    const validationStatus =
      validationGate.unresolved_block_count > 0
        ? `Blocked (${validationGate.unresolved_block_count} unresolved)`
        : validationResults.length === 0
          ? "Not run"
          : "Clear";

    const openWarningCount = countOpenWarnings(validationResults);

    const readyStatus: ReadinessTier = deriveReadinessTier({
      validation_run: validationResults.length > 0,
      unresolved_block_count: validationGate.unresolved_block_count,
      open_warning_count: openWarningCount,
      can_approve: validationGate.can_approve,
    });

    return {
      boq_version_id: boqVersionId,
      project_id: projectId,
      generated_at: new Date().toISOString(),
      project: {
        project_name: version.project.project_name,
        boq_version_no: version.version_no,
        workflow_status: version.status,
        approval_status: formatApprovalStatus(approvalPage?.workflow ?? null),
        lock_status: version.lock_status,
        handoff_status: formatHandoffStatus(latestHandoffs),
      },
      document: {
        total_documents: projectDocs.length,
        required_documents: requiredDocuments,
        missing_documents: missingDocuments,
        document_validation_status: documentValidationStatus,
      },
      discipline: {
        included_disciplines: disciplines
          .filter((d) => d.included_flag)
          .map((d) => `${d.discipline_code} — ${d.discipline_name}`),
        excluded_disciplines: disciplines
          .filter((d) => !d.included_flag)
          .map((d) => `${d.discipline_code} — ${d.discipline_name}`),
        blocked_disciplines: includedWithoutLines.map(
          (d) =>
            `${d.discipline.discipline_code} — ${d.discipline.discipline_name} (no BOQ lines)`,
        ),
        risk_summary: buildRiskSummary(disciplines),
      },
      cost: buildCostSummary(summary, version.project.currency),
      validation: {
        validation_status: validationStatus,
        total_validation_rules: activeRuleCount,
        total_results: validationResults.length,
        warning_count: openWarningCount,
        block_count: validationGate.unresolved_block_count,
        unresolved_blocks: validationGate.unresolved_block_count,
        open_warning_count: openWarningCount,
        ready_status: readyStatus,
        can_approve: validationGate.can_approve,
        can_handoff: validationGate.can_handoff,
        block_reason: validationGate.block_reason,
        results: validationResults,
      },
      summary,
    };
  },

  /** Alias used by export engine */
  buildConsolidatedSummary(projectId: string, boqVersionId: string) {
    return this.getBoqSummaryReport(projectId, boqVersionId);
  },

  /** Consolidated report DTO for Reporting Validation (Sprint 6D rule set). */
  async buildConsolidatedReport(
    projectId: string,
    boqVersionId: string,
  ): Promise<BoqConsolidatedReport> {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return {
        project: null,
        document: null,
        discipline: null,
        cost: null,
        validation: null,
      };
    }

    const [
      project,
      docLinks,
      disciplines,
      summaryResult,
      validationResults,
      validationGate,
    ] = await Promise.all([
      prisma.projects.findUnique({
        where: { project_id: projectId },
        select: {
          project_id: true,
          project_name: true,
          location: true,
          it_load_kw: true,
          rack_count: true,
          currency: true,
        },
      }),
      documentService.listBoqDocumentLinks(boqVersionId),
      disciplineService.getProjectDisciplines(projectId, boqVersionId),
      boqSummaryService.getSummaryForVersion(boqVersionId),
      validationService.listResultsWithRules(boqVersionId),
      validationService.getWorkflowGate(boqVersionId),
    ]);

    const dependencySummary = documentService.getDependencySummary(docLinks);

    return {
      project: project
        ? {
            project_id: project.project_id,
            project_name: project.project_name,
            location: project.location,
            it_load_kw: Number(project.it_load_kw ?? 0),
            rack_count: Number(project.rack_count ?? 0),
            currency: project.currency,
          }
        : null,
      document: {
        links: docLinks,
        required_count: dependencySummary.required_count,
        satisfied_count: dependencySummary.satisfied_count,
      },
      discipline: {
        rows: disciplines,
        included_count: disciplines.filter((d) => d.included_flag).length,
      },
      cost: summaryResult.summary,
      validation: {
        results: validationResults,
        unresolved_block_count: validationGate.unresolved_block_count,
        validation_run: validationResults.length > 0,
      },
    };
  },
};
