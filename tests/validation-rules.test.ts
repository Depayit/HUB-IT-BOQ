import { describe, it, expect } from "vitest";
import {
  COST_VALIDATION_RULE_CODES,
  resultStatusForRule,
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

  it("maps low confidence to Warning result status", () => {
    expect(resultStatusForRule("COST_LOW_CONFIDENCE")).toBe("Warning");
    expect(VALIDATION_RULE_DEFINITIONS.COST_LOW_CONFIDENCE.severity).toBe("WARNING");
  });

  it("maps block rules to Fail result status", () => {
    expect(resultStatusForRule("COST_ZERO_VALUE")).toBe("Fail");
  });
});
