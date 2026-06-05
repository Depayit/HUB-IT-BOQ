import { describe, it, expect } from "vitest";
import {
  evaluateCostLineValidation,
  isLowConfidence,
} from "@/lib/validations/cost-validation";

const lineBase = {
  boq_line_id: "00000000-0000-4000-8000-000000000001",
  line_no: 1,
  item_description: "Test item",
};

const breakdownBase = {
  boq_cost_breakdown_id: "00000000-0000-4000-8000-000000000002",
  cost_category_id: "00000000-0000-4000-8000-000000000010",
  category_code: "MATERIAL",
  calculated_value: 100,
  confidence_level: "High",
  manual_override_flag: false,
  override_reason: null,
};

describe("cost validation rules", () => {
  it("flags missing cost layer", () => {
    const issues = evaluateCostLineValidation({ ...lineBase, breakdowns: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0].rule_code).toBe("COST_LAYER_MISSING");
    expect(issues[0].severity).toBe("BLOCK");
  });

  it("flags duplicate cost category on same line", () => {
    const issues = evaluateCostLineValidation({
      ...lineBase,
      breakdowns: [
        breakdownBase,
        {
          ...breakdownBase,
          boq_cost_breakdown_id: "00000000-0000-4000-8000-000000000003",
        },
      ],
    });
    expect(issues.some((i) => i.rule_code === "COST_CATEGORY_DUPLICATE")).toBe(true);
  });

  it("flags zero calculated value", () => {
    const issues = evaluateCostLineValidation({
      ...lineBase,
      breakdowns: [{ ...breakdownBase, calculated_value: 0 }],
    });
    expect(issues.some((i) => i.rule_code === "COST_ZERO_VALUE")).toBe(true);
  });

  it("flags invalid manual override without reason", () => {
    const issues = evaluateCostLineValidation({
      ...lineBase,
      breakdowns: [
        {
          ...breakdownBase,
          manual_override_flag: true,
          override_reason: "  ",
        },
      ],
    });
    expect(issues.some((i) => i.rule_code === "COST_OVERRIDE_INVALID")).toBe(true);
  });

  it("warns on low confidence", () => {
    const issues = evaluateCostLineValidation({
      ...lineBase,
      breakdowns: [{ ...breakdownBase, confidence_level: "Low" }],
    });
    const warning = issues.find((i) => i.rule_code === "COST_LOW_CONFIDENCE");
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe("WARNING");
  });

  it("detects low confidence case-insensitively", () => {
    expect(isLowConfidence("low")).toBe(true);
    expect(isLowConfidence("HIGH")).toBe(false);
  });
});
