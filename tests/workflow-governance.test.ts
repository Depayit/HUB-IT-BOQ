import { describe, it, expect } from "vitest";
import {
  evaluateDesignBasisApproval,
  evaluateHandoffLock,
  projectRequiresSld,
} from "@/lib/validations/workflow-governance";
import {
  APPROVAL_BLOCK_RULES,
  HANDOFF_BLOCK_RULES,
  VALIDATION_RULE_DEFINITIONS,
} from "@/lib/validations/validation-rules";

describe("workflow governance", () => {
  it("requires SLD for data center BOQ regardless of project type", () => {
    expect(projectRequiresSld("DataCenter")).toBe(true);
    expect(projectRequiresSld(null)).toBe(true);
  });

  it("passes design basis approval only when Approved", () => {
    expect(evaluateDesignBasisApproval("Approved").passes).toBe(true);
    expect(evaluateDesignBasisApproval("InReview").passes).toBe(false);
    expect(evaluateDesignBasisApproval(null).passes).toBe(false);
  });

  it("passes handoff lock check only when Locked", () => {
    expect(evaluateHandoffLock("Locked").passes).toBe(true);
    expect(evaluateHandoffLock("Unlocked").passes).toBe(false);
  });
});

describe("validation gate rule sets", () => {
  it("includes governance block rules and every block rule has a definition", () => {
    expect(APPROVAL_BLOCK_RULES).toContain("DESIGN_BASIS_NOT_APPROVED");
    for (const code of APPROVAL_BLOCK_RULES) {
      expect(VALIDATION_RULE_DEFINITIONS[code].severity).toBe("BLOCK");
    }
  });

  it("handoff gate is a superset of approval gate plus lock rule", () => {
    expect(HANDOFF_BLOCK_RULES).toContain("HANDOFF_WITHOUT_LOCK");
    for (const code of APPROVAL_BLOCK_RULES) {
      expect(HANDOFF_BLOCK_RULES).toContain(code);
    }
  });
});
