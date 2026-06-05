import { describe, it, expect } from "vitest";
import type { BoqDocumentLinkRow } from "@/lib/services/document.service";
import type { ProjectDisciplineRow } from "@/lib/services/discipline.service";
import type { BoqSummaryView } from "@/lib/services/boq-summary.service";
import {
  buildDifferenceSummary,
  compareCost,
  compareDisciplines,
  compareDocuments,
  compareWorkflow,
} from "@/lib/services/revision-comparison.service";

function docLink(
  documentId: string,
  name: string,
  overrides: Partial<BoqDocumentLinkRow> = {},
): BoqDocumentLinkRow {
  return {
    boq_version_document_id: `link-${documentId}`,
    document_id: documentId,
    dependency_type: "Reference",
    is_required: true,
    dependency_status: "Pending",
    document: {
      document_id: documentId,
      document_type: "TOR",
      document_name: name,
      file_link: null,
      version_no: "1",
      document_status: "Draft",
      related_workflow_stage: null,
      created_at: "",
      updated_at: "",
    },
    ...overrides,
  };
}

function disciplineRow(
  id: string,
  code: string,
  included: boolean,
  risk: "Low" | "Medium" | "High" = "Medium",
): ProjectDisciplineRow {
  return {
    project_discipline_id: `pd-${id}`,
    project_id: "p1",
    boq_version_id: "v1",
    discipline_id: id,
    discipline_code: code,
    discipline_name: code,
    description: null,
    included_flag: included,
    scope_description: null,
    exclusion_note: null,
    risk_level: risk,
    boq_line_count: included ? 1 : 0,
    workflow_status: included ? "Included" : "Pending",
    created_at: "",
    updated_at: "",
  };
}

function summary(subtotal: number, margin = 15): BoqSummaryView {
  return {
    boq_summary_id: "s1",
    boq_version_id: "v1",
    total_material_cost: subtotal,
    total_labor_cost: 0,
    total_logistics_cost: 0,
    total_testing_cost: 0,
    total_documentation_cost: 0,
    total_indirect_cost: 0,
    total_risk_cost: 0,
    total_overhead_cost: 0,
    subtotal_before_margin: subtotal,
    margin_percent: margin,
    selling_price: subtotal * (1 + margin / 100),
    gross_profit: 0,
    gross_margin_percent: 0,
    breakdown_line_count: 1,
    updated_at: "",
  };
}

describe("revision comparison", () => {
  it("detects document added, removed, and modified", () => {
    const baseline = [docLink("d1", "TOR A")];
    const current = [
      docLink("d2", "SLD B"),
      docLink("d1", "TOR A Updated", {
        dependency_status: "Satisfied",
        document: {
          ...docLink("d1", "TOR A").document,
          document_name: "TOR A Updated",
        },
      }),
    ];

    const diff = compareDocuments(baseline, current);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.document_id).toBe("d2");
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]?.document_id).toBe("d1");
  });

  it("detects discipline included, excluded, and risk changes", () => {
    const baseline = [
      disciplineRow("1", "ELEC", false, "Low"),
      disciplineRow("2", "HVAC", true, "Medium"),
    ];
    const current = [
      disciplineRow("1", "ELEC", true, "High"),
      disciplineRow("2", "HVAC", false, "Medium"),
    ];

    const diff = compareDisciplines(baseline, current);
    expect(diff.included).toHaveLength(1);
    expect(diff.excluded).toHaveLength(1);
    expect(diff.risk_changes).toHaveLength(1);
    expect(diff.risk_changes[0]?.discipline_code).toBe("ELEC");
  });

  it("detects cost category and margin changes", () => {
    const diff = compareCost(summary(1000, 15), summary(1200, 20));
    expect(diff.category_totals.length).toBeGreaterThan(0);
    expect(diff.grand_total.subtotal_before_margin.delta).toBe(200);
    expect(diff.margin.margin_percent.delta).toBe(5);
  });

  it("detects workflow status and lock changes", () => {
    const diff = compareWorkflow(
      {
        status: "Draft",
        lock_status: "Unlocked",
        approval_stage: null,
        approval_status: null,
      },
      {
        status: "Locked",
        lock_status: "Locked",
        approval_stage: "Final Lock",
        approval_status: "Completed",
      },
    );
    expect(diff.status).not.toBeNull();
    expect(diff.lock).not.toBeNull();
    expect(diff.approval).not.toBeNull();
  });

  it("builds difference summary totals", () => {
    const documents = compareDocuments([], [docLink("d1", "A")]);
    const disciplines = compareDisciplines([], [disciplineRow("1", "E", true)]);
    const cost = compareCost(null, summary(500));
    const workflow = compareWorkflow(
      { status: "Draft", lock_status: "Unlocked", approval_stage: null, approval_status: null },
      { status: "InReview", lock_status: "Unlocked", approval_stage: null, approval_status: null },
    );
    const summaryResult = buildDifferenceSummary(
      documents,
      disciplines,
      cost,
      workflow,
    );
    expect(summaryResult.total_changes).toBeGreaterThan(0);
    expect(summaryResult.documents.added).toBe(1);
  });
});
