import type { validation_severity } from "@prisma/client";

export const DISCIPLINE_RULE_CODES = [
  "DISCIPLINE_NO_LINES",
  "DISCIPLINE_INVALID_RISK",
  "DISCIPLINE_DUPLICATE",
  "DISCIPLINE_MISSING_SCOPE",
  "DISCIPLINE_CRITICAL_NO_RISK",
] as const;

export type DisciplineRuleCode = (typeof DISCIPLINE_RULE_CODES)[number];

export type DisciplineRuleDefinition = {
  rule_code: DisciplineRuleCode;
  rule_group: string;
  severity: validation_severity;
  target_object_type: string;
  message: string;
};

export const DISCIPLINE_RULE_DEFINITIONS: Record<DisciplineRuleCode, DisciplineRuleDefinition> = {
  DISCIPLINE_NO_LINES: {
    rule_code: "DISCIPLINE_NO_LINES",
    rule_group: "Discipline",
    severity: "BLOCK",
    target_object_type: "project_discipline",
    message: "Included discipline must have at least one BOQ line",
  },
  DISCIPLINE_INVALID_RISK: {
    rule_code: "DISCIPLINE_INVALID_RISK",
    rule_group: "Discipline",
    severity: "BLOCK",
    target_object_type: "project_discipline",
    message: "Risk level must be Low, Medium, High, or Critical",
  },
  DISCIPLINE_DUPLICATE: {
    rule_code: "DISCIPLINE_DUPLICATE",
    rule_group: "Discipline",
    severity: "BLOCK",
    target_object_type: "project_discipline",
    message: "Duplicate discipline assignment for this BOQ version",
  },
  DISCIPLINE_MISSING_SCOPE: {
    rule_code: "DISCIPLINE_MISSING_SCOPE",
    rule_group: "Discipline",
    severity: "WARNING",
    target_object_type: "project_discipline",
    message: "Included discipline should have a scope description",
  },
  DISCIPLINE_CRITICAL_NO_RISK: {
    rule_code: "DISCIPLINE_CRITICAL_NO_RISK",
    rule_group: "Discipline",
    severity: "WARNING",
    target_object_type: "project_discipline",
    message: "Critical risk discipline requires risk assessment in scope description",
  },
};

export const DISCIPLINE_APPROVAL_BLOCK_RULES: DisciplineRuleCode[] = [
  "DISCIPLINE_NO_LINES",
  "DISCIPLINE_INVALID_RISK",
  "DISCIPLINE_DUPLICATE",
];
