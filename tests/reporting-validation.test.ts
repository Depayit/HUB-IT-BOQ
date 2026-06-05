import { describe, it, expect } from "vitest";
import {
  REPORT_VALIDATION_CODES,
  validateCostSummary,
  validateDisciplineSummary,
  validateDocumentSummary,
  validateExportReady,
  validateProjectSummary,
  validateReportCompleteness,
  validateValidationSummary,
  type BoqConsolidatedReport,
} from "@/lib/validations/reporting";
import type { BoqSummaryView } from "@/lib/services/boq-summary.service";

function completeReport(): BoqConsolidatedReport {
  const cost: BoqSummaryView = {
    boq_summary_id: "s1",
    boq_version_id: "v1",
    total_material_cost: 1000,
    total_labor_cost: 0,
    total_logistics_cost: 0,
    total_testing_cost: 0,
    total_documentation_cost: 0,
    total_indirect_cost: 0,
    total_risk_cost: 0,
    total_overhead_cost: 0,
    subtotal_before_margin: 1000,
    margin_percent: 15,
    selling_price: 1150,
    gross_profit: 150,
    gross_margin_percent: 13,
    breakdown_line_count: 3,
    updated_at: "",
  };

  return {
    project: {
      project_id: "p1",
      project_name: "Test DC",
      location: "Bangkok",
      it_load_kw: 500,
      rack_count: 10,
      currency: "THB",
    },
    document: {
      links: [
        {
          boq_version_document_id: "l1",
          document_id: "d1",
          dependency_type: "Reference",
          is_required: true,
          dependency_status: "Satisfied",
          document: {
            document_id: "d1",
            document_type: "TOR",
            document_name: "TOR",
            file_link: null,
            version_no: "1",
            document_status: "Active",
            related_workflow_stage: null,
            created_at: "",
            updated_at: "",
          },
        },
      ],
      required_count: 1,
      satisfied_count: 1,
    },
    discipline: {
      rows: [],
      included_count: 2,
    },
    cost,
    validation: {
      results: [],
      unresolved_block_count: 0,
      validation_run: true,
    },
  };
}

describe("reporting validation", () => {
  it("exports all six rule codes", () => {
    expect(REPORT_VALIDATION_CODES).toHaveLength(6);
    expect(REPORT_VALIDATION_CODES).toContain("REPORT_EXPORT_NOT_READY");
  });

  it("PASS when report is complete", () => {
    const result = validateReportCompleteness(completeReport());
    expect(result.is_complete).toBe(true);
    expect(result.is_export_ready).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.passed_codes).toHaveLength(6);
  });

  it("FAIL REPORT_PROJECT_INCOMPLETE without location", () => {
    const report = completeReport();
    report.project = { ...report.project!, location: null };
    expect(validateProjectSummary(report.project)?.code).toBe(
      "REPORT_PROJECT_INCOMPLETE",
    );
    const result = validateReportCompleteness(report);
    expect(result.issues.some((i) => i.code === "REPORT_PROJECT_INCOMPLETE")).toBe(
      true,
    );
  });

  it("FAIL REPORT_DOCUMENT_INCOMPLETE without links", () => {
    expect(
      validateDocumentSummary({ links: [], required_count: 0, satisfied_count: 0 })
        ?.code,
    ).toBe("REPORT_DOCUMENT_INCOMPLETE");
  });

  it("FAIL REPORT_DISCIPLINE_INCOMPLETE without included", () => {
    expect(
      validateDisciplineSummary({ rows: [], included_count: 0 })?.code,
    ).toBe("REPORT_DISCIPLINE_INCOMPLETE");
  });

  it("FAIL REPORT_COST_INCOMPLETE without summary", () => {
    expect(validateCostSummary(null)?.code).toBe("REPORT_COST_INCOMPLETE");
  });

  it("FAIL REPORT_VALIDATION_INCOMPLETE when validation not run", () => {
    expect(
      validateValidationSummary({
        results: [],
        unresolved_block_count: 0,
        validation_run: false,
      })?.code,
    ).toBe("REPORT_VALIDATION_INCOMPLETE");
  });

  it("FAIL REPORT_EXPORT_NOT_READY when section issues exist", () => {
    const exportIssue = validateExportReady([
      { code: "REPORT_COST_INCOMPLETE", message: "x" },
    ]);
    expect(exportIssue?.code).toBe("REPORT_EXPORT_NOT_READY");
  });
});
