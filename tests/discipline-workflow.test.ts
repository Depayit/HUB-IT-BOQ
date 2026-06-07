import { describe, it, expect } from "vitest";
import {
  deriveDisciplineWorkflowStatus,
  evaluateDisciplineValidation,
  isValidRiskLevel,
} from "@/lib/validations/discipline-workflow";

const baseRow = {
  project_discipline_id: "00000000-0000-4000-8000-000000000010",
  discipline_id: "00000000-0000-4000-8000-000000000020",
  discipline_code: "PWR",
  discipline_name: "Power",
  included_flag: false,
  scope_description: null,
  exclusion_note: null,
  risk_level: "Medium",
  boq_line_count: 0,
};

describe("discipline workflow status", () => {
  it("returns Pending when not included and no exclusion note", () => {
    expect(deriveDisciplineWorkflowStatus(baseRow)).toBe("Pending");
  });

  it("returns Excluded when not included with exclusion note", () => {
    expect(
      deriveDisciplineWorkflowStatus({ ...baseRow, exclusion_note: "Out of scope" }),
    ).toBe("Excluded");
  });

  it("returns Included when included with BOQ lines", () => {
    expect(
      deriveDisciplineWorkflowStatus({ ...baseRow, included_flag: true, boq_line_count: 2 }),
    ).toBe("Included");
  });

  it("returns Blocked when included without BOQ lines", () => {
    expect(
      deriveDisciplineWorkflowStatus({ ...baseRow, included_flag: true, boq_line_count: 0 }),
    ).toBe("Blocked");
  });
});

describe("discipline integrity validation", () => {
  it("Rule A: BLOCK included without BOQ line", () => {
    const findings = evaluateDisciplineValidation([
      { ...baseRow, included_flag: true, boq_line_count: 0 },
    ]);
    expect(findings.some((f) => f.rule_code === "DISCIPLINE_NO_LINES" && f.severity === "BLOCK")).toBe(
      true,
    );
  });

  it("Rule B: BLOCK invalid risk level", () => {
    const findings = evaluateDisciplineValidation([{ ...baseRow, risk_level: "Extreme" }]);
    expect(findings.some((f) => f.rule_code === "DISCIPLINE_INVALID_RISK")).toBe(true);
  });

  it("Rule C: BLOCK duplicate discipline", () => {
    const dupId = "00000000-0000-4000-8000-000000000099";
    const findings = evaluateDisciplineValidation([
      { ...baseRow, project_discipline_id: "a", discipline_id: dupId },
      {
        ...baseRow,
        project_discipline_id: "b",
        discipline_id: dupId,
        discipline_code: "CLG",
      },
    ]);
    expect(findings.filter((f) => f.rule_code === "DISCIPLINE_DUPLICATE")).toHaveLength(2);
  });

  it("Rule D: WARNING missing scope when lines exist", () => {
    const findings = evaluateDisciplineValidation([
      { ...baseRow, included_flag: true, boq_line_count: 1 },
    ]);
    expect(findings.some((f) => f.rule_code === "DISCIPLINE_MISSING_SCOPE")).toBe(true);
  });

  it("Rule D2: no MISSING_SCOPE when mandatory line mapping is absent (BLOCK instead)", () => {
    const findings = evaluateDisciplineValidation([
      { ...baseRow, included_flag: true, boq_line_count: 0 },
    ]);
    expect(findings.some((f) => f.rule_code === "DISCIPLINE_NO_LINES")).toBe(true);
    expect(findings.some((f) => f.rule_code === "DISCIPLINE_MISSING_SCOPE")).toBe(false);
  });

  it("Rule E: WARNING critical without risk assessment", () => {
    const findings = evaluateDisciplineValidation([
      { ...baseRow, included_flag: true, boq_line_count: 1, risk_level: "Critical" },
    ]);
    expect(findings.some((f) => f.rule_code === "DISCIPLINE_CRITICAL_NO_RISK")).toBe(true);
  });

  it("excluded discipline does not require BOQ line", () => {
    expect(evaluateDisciplineValidation([baseRow]).some((f) => f.rule_code === "DISCIPLINE_NO_LINES")).toBe(
      false,
    );
  });

  it("validates risk levels", () => {
    expect(isValidRiskLevel("Critical")).toBe(true);
    expect(isValidRiskLevel("Invalid")).toBe(false);
  });
});
