import { describe, it, expect } from "vitest";
import {
  COST_VALIDATION_RULE_CODES,
  DISCIPLINE_RULE_CODES,
  REPORTING_GOVERNANCE_WARNING_CODES,
  resultStatusForRule,
  VALIDATION_RULE_CODES,
  VALIDATION_RULE_DEFINITIONS,
} from "@/lib/validations/validation-rules";

describe("validation rules", () => {
  it("defines all sprint 4E cost rule codes", () => {
    expect(COST_VALIDATION_RULE_CODES).toEqual([
      "COST_LAYER_MISSING",
      "COST_CATEGORY_DUPLICATE",
      "COST_ZERO_VALUE",
      "COST_OVERRIDE_INVALID",
      "COST_LOW_CONFIDENCE",
    ]);
  });

  it("includes discipline SSOT rule codes in engine registry", () => {
    for (const code of DISCIPLINE_RULE_CODES) {
      expect(VALIDATION_RULE_CODES).toContain(code);
      expect(VALIDATION_RULE_DEFINITIONS[code]).toBeDefined();
    }
  });

  it("maps low confidence to Warning result status", () => {
    expect(resultStatusForRule("COST_LOW_CONFIDENCE")).toBe("Warning");
    expect(VALIDATION_RULE_DEFINITIONS.COST_LOW_CONFIDENCE.severity).toBe("WARNING");
  });

  it("maps missing scope to Warning and no-lines to Fail", () => {
    expect(resultStatusForRule("DISCIPLINE_MISSING_SCOPE")).toBe("Warning");
    expect(resultStatusForRule("DISCIPLINE_NO_LINES")).toBe("Fail");
  });

  it("maps block rules to Fail result status", () => {
    expect(resultStatusForRule("COST_ZERO_VALUE")).toBe("Fail");
  });

  it("includes reporting governance WARNING codes in engine registry (S7B-2B)", () => {
    for (const code of REPORTING_GOVERNANCE_WARNING_CODES) {
      expect(VALIDATION_RULE_CODES).toContain(code);
      expect(VALIDATION_RULE_DEFINITIONS[code].severity).toBe("WARNING");
      expect(resultStatusForRule(code)).toBe("Warning");
    }
  });
});
