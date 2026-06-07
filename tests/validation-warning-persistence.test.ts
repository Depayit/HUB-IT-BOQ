import { describe, it, expect } from "vitest";

import {
  aggregateDisciplineBlockFindings,
  aggregateWarningFindings,
  collectCostValidationWarnings,
  collectDisciplineValidationFindings,
  countOpenWarnings,
  isOpenWarning,
  toPersistableFinding,
} from "@/lib/validations/validation-findings";
import { evaluateDisciplineValidation } from "@/lib/validations/discipline-validation";
import {
  deriveReadinessTier,
  isForwardableTier,
} from "@/lib/validations/readiness";
import { isReportExportBlocked } from "@/lib/validations/reporting";
import { isUnresolvedBlock } from "@/lib/services/validation.service";
import { resultStatusForRule } from "@/lib/validations/validation-rules";

const disciplineBase = {
  project_discipline_id: "00000000-0000-4000-8000-000000000010",
  discipline_id: "00000000-0000-4000-8000-000000000020",
  discipline_code: "PWR",
  discipline_name: "Power",
  included_flag: true,
  scope_description: null as string | null,
  exclusion_note: null,
  risk_level: "Medium",
  boq_line_count: 1,
};

const costLineBase = {
  boq_line_id: "00000000-0000-4000-8000-000000000030",
  line_no: 1,
  item_description: "UPS module",
  breakdowns: [
    {
      boq_cost_breakdown_id: "00000000-0000-4000-8000-000000000040",
      cost_category_id: "00000000-0000-4000-8000-000000000050",
      category_code: "MATERIAL",
      calculated_value: 1000,
      confidence_level: "Low",
      manual_override_flag: false,
      override_reason: null,
    },
  ],
};

describe("validation findings aggregator (S7B-2A)", () => {
  it("collects COST_LOW_CONFIDENCE via warning collector without touching BLOCK-only service path", () => {
    const warnings = collectCostValidationWarnings([costLineBase]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.rule_code).toBe("COST_LOW_CONFIDENCE");
    expect(warnings[0]?.severity).toBe("WARNING");
  });

  it("maps optional missing scope to WARNING and mandatory missing line mapping to BLOCK", () => {
    const scopeWarning = collectDisciplineValidationFindings([disciplineBase]);
    expect(scopeWarning.some((f) => f.rule_code === "DISCIPLINE_MISSING_SCOPE")).toBe(true);
    expect(scopeWarning.every((f) => f.severity === "WARNING")).toBe(true);

    const mappingBlock = collectDisciplineValidationFindings([
      { ...disciplineBase, boq_line_count: 0 },
    ]);
    expect(mappingBlock.some((f) => f.rule_code === "DISCIPLINE_NO_LINES")).toBe(true);
    expect(mappingBlock.some((f) => f.rule_code === "DISCIPLINE_MISSING_SCOPE")).toBe(false);
  });

  it("uses discipline validation SSOT (not duplicate evaluator)", () => {
    const ssot = evaluateDisciplineValidation([disciplineBase]);
    const aggregated = collectDisciplineValidationFindings([disciplineBase]);
    expect(aggregated.map((f) => f.rule_code)).toEqual(ssot.map((f) => f.rule_code));
  });

  it("persists WARNING findings with Warning result status", () => {
    const persisted = toPersistableFinding(
      collectCostValidationWarnings([costLineBase])[0]!,
    );
    expect(persisted.result_status).toBe("Warning");
    expect(resultStatusForRule("COST_LOW_CONFIDENCE")).toBe("Warning");
    expect(resultStatusForRule("DISCIPLINE_MISSING_SCOPE")).toBe("Warning");
  });

  it("aggregateWarningFindings merges cost + discipline WARNING rows", () => {
    const findings = aggregateWarningFindings({
      costLines: [costLineBase],
      disciplines: [disciplineBase],
    });
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.rule_code).sort()).toEqual([
      "COST_LOW_CONFIDENCE",
      "DISCIPLINE_MISSING_SCOPE",
    ]);
  });
});

describe("warning tier contract (S7B-2A)", () => {
  function gateFromPersisted(findings: ReturnType<typeof aggregateWarningFindings>) {
    const rows = findings.map((f) => ({
      severity: f.severity,
      resolved_flag: false,
      result_status: f.result_status,
      rule_code: f.rule_code,
    }));
    const unresolved_block_count = rows.filter(isUnresolvedBlock).length;
    const open_warning_count = countOpenWarnings(rows);
    const can_approve = rows.every(
      (row) =>
        !isUnresolvedBlock(row) &&
        !(row.severity === "BLOCK" && row.result_status === "Fail"),
    );
    return { rows, unresolved_block_count, open_warning_count, can_approve: true };
  }

  it("readiness = Warning when WARNING persisted and block count = 0", () => {
    const findings = aggregateWarningFindings({
      costLines: [costLineBase],
      disciplines: [disciplineBase],
    });
    const gate = gateFromPersisted(findings);

    expect(gate.unresolved_block_count).toBe(0);
    expect(gate.open_warning_count).toBe(2);
    expect(
      deriveReadinessTier({
        validation_run: true,
        unresolved_block_count: gate.unresolved_block_count,
        open_warning_count: gate.open_warning_count,
        can_approve: true,
      }),
    ).toBe("Warning");
  });

  it("approval/handoff/export remain allowed with warning flag (forwardable tier)", () => {
    const tier = deriveReadinessTier({
      validation_run: true,
      unresolved_block_count: 0,
      open_warning_count: 2,
      can_approve: true,
    });
    expect(isForwardableTier(tier)).toBe(true);
    expect(isReportExportBlocked(0)).toBe(false);
  });

  it("mandatory missing mapping BLOCK prevents forward action", () => {
    const blocks = aggregateDisciplineBlockFindings([
      { ...disciplineBase, boq_line_count: 0 },
    ]);
    expect(blocks.some((f) => f.rule_code === "DISCIPLINE_NO_LINES")).toBe(true);

    const rows = blocks.map((f) => ({
      severity: f.severity,
      resolved_flag: false,
      result_status: f.result_status,
    }));
    expect(rows.filter(isUnresolvedBlock)).toHaveLength(1);
    expect(
      deriveReadinessTier({
        validation_run: true,
        unresolved_block_count: 1,
        open_warning_count: 0,
        can_approve: false,
      }),
    ).toBe("Blocked");
    expect(isForwardableTier("Blocked")).toBe(false);
    expect(isReportExportBlocked(1)).toBe(true);
  });

  it("isOpenWarning ignores resolved and pass rows", () => {
    expect(
      isOpenWarning({
        severity: "WARNING",
        resolved_flag: false,
        result_status: "Warning",
      }),
    ).toBe(true);
    expect(
      isOpenWarning({
        severity: "WARNING",
        resolved_flag: true,
        result_status: "Pass",
      }),
    ).toBe(false);
  });
});
