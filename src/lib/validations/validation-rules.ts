import type { validation_result_status, validation_severity } from "@prisma/client";
import {
  COST_VALIDATION_RULE_CODES,
  type CostValidationRuleCode,
} from "@/lib/validations/cost-validation";
import {
  DISCIPLINE_RULE_CODES,
  DISCIPLINE_RULE_DEFINITIONS,
  DISCIPLINE_APPROVAL_BLOCK_RULES,
  type DisciplineRuleCode,
} from "@/lib/validations/discipline-rules";

export { COST_VALIDATION_RULE_CODES, type CostValidationRuleCode };
export { DISCIPLINE_RULE_CODES, type DisciplineRuleCode };

export const DOC_RULE_CODES = [
  "DOC_TOR_REQUIRED",
  "DOC_SLD_REQUIRED",
  "DOC_SPEC_HANDOFF",
] as const;

export const GOVERNANCE_RULE_CODES = [
  "DESIGN_BASIS_NOT_APPROVED",
  "HANDOFF_WITHOUT_LOCK",
] as const;

export const VALIDATION_RULE_CODES = [
  "CRITICAL_LINE_ZERO_COST",
  ...DOC_RULE_CODES,
  ...DISCIPLINE_RULE_CODES,
  ...COST_VALIDATION_RULE_CODES,
  ...GOVERNANCE_RULE_CODES,
] as const;

export type ValidationRuleCode = (typeof VALIDATION_RULE_CODES)[number];

type ValidationRuleDefinition = {
  rule_group: string;
  severity: validation_severity;
  message: string;
  target_object_type: string;
};

function disciplineRuleDefinition(code: DisciplineRuleCode): ValidationRuleDefinition {
  const def = DISCIPLINE_RULE_DEFINITIONS[code];
  return {
    rule_group: def.rule_group,
    severity: def.severity,
    message: def.message,
    target_object_type: def.target_object_type,
  };
}

export const VALIDATION_RULE_DEFINITIONS: Record<
  ValidationRuleCode,
  ValidationRuleDefinition
> = {
  CRITICAL_LINE_ZERO_COST: {
    rule_group: "Cost",
    severity: "BLOCK",
    message: "Critical BOQ line must have cost layer total greater than zero",
    target_object_type: "boq_line",
  },
  DOC_TOR_REQUIRED: {
    rule_group: "Document",
    severity: "BLOCK",
    message: "Terms of Reference (TOR) is required",
    target_object_type: "document",
  },
  DOC_SLD_REQUIRED: {
    rule_group: "Document",
    severity: "BLOCK",
    message: "Single Line Diagram (SLD) is required",
    target_object_type: "document",
  },
  DOC_SPEC_HANDOFF: {
    rule_group: "Document",
    severity: "BLOCK",
    message: "Specification (Handoff) is required",
    target_object_type: "document",
  },
  DISCIPLINE_NO_LINES: disciplineRuleDefinition("DISCIPLINE_NO_LINES"),
  DISCIPLINE_INVALID_RISK: disciplineRuleDefinition("DISCIPLINE_INVALID_RISK"),
  DISCIPLINE_DUPLICATE: disciplineRuleDefinition("DISCIPLINE_DUPLICATE"),
  DISCIPLINE_MISSING_SCOPE: disciplineRuleDefinition("DISCIPLINE_MISSING_SCOPE"),
  DISCIPLINE_CRITICAL_NO_RISK: disciplineRuleDefinition("DISCIPLINE_CRITICAL_NO_RISK"),
  COST_LAYER_MISSING: {
    rule_group: "Cost",
    severity: "BLOCK",
    message: "BOQ line must have at least one cost layer breakdown",
    target_object_type: "boq_line",
  },
  COST_CATEGORY_DUPLICATE: {
    rule_group: "Cost",
    severity: "BLOCK",
    message: "Duplicate cost category on the same BOQ line",
    target_object_type: "boq_line",
  },
  COST_ZERO_VALUE: {
    rule_group: "Cost",
    severity: "BLOCK",
    message: "Cost breakdown calculated value must be greater than zero",
    target_object_type: "boq_cost_breakdown",
  },
  COST_OVERRIDE_INVALID: {
    rule_group: "Cost",
    severity: "BLOCK",
    message: "Manual override requires override reason",
    target_object_type: "boq_cost_breakdown",
  },
  COST_LOW_CONFIDENCE: {
    rule_group: "Cost",
    severity: "WARNING",
    message: "Cost breakdown has low confidence level",
    target_object_type: "boq_cost_breakdown",
  },
  DESIGN_BASIS_NOT_APPROVED: {
    rule_group: "Governance",
    severity: "BLOCK",
    message: "Design Basis must be Approved before BOQ approval",
    target_object_type: "design_basis_version",
  },
  HANDOFF_WITHOUT_LOCK: {
    rule_group: "Governance",
    severity: "BLOCK",
    message: "BOQ must be Locked before handoff",
    target_object_type: "boq_version",
  },
};

export const APPROVAL_BLOCK_RULES: readonly ValidationRuleCode[] = [
  "CRITICAL_LINE_ZERO_COST",
  "DOC_TOR_REQUIRED",
  "DOC_SLD_REQUIRED",
  "DOC_SPEC_HANDOFF",
  ...DISCIPLINE_APPROVAL_BLOCK_RULES,
  "COST_LAYER_MISSING",
  "COST_CATEGORY_DUPLICATE",
  "COST_ZERO_VALUE",
  "COST_OVERRIDE_INVALID",
  "DESIGN_BASIS_NOT_APPROVED",
];

export const HANDOFF_BLOCK_RULES: readonly ValidationRuleCode[] = [
  ...APPROVAL_BLOCK_RULES,
  "HANDOFF_WITHOUT_LOCK",
];

export { projectRequiresSld } from "@/lib/validations/workflow-governance";

export function resultStatusForRule(
  ruleCode: ValidationRuleCode,
): validation_result_status {
  return VALIDATION_RULE_DEFINITIONS[ruleCode].severity === "WARNING"
    ? "Warning"
    : "Fail";
}
