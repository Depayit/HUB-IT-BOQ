/**
 * Unified validation findings aggregator (S7B-2A).
 *
 * BLOCK findings for cost layers remain sourced via costBreakdownService.findCostLayerValidationFailures
 * (BLOCK-only). WARNING cost findings are collected here — not injected into that helper.
 */
import type { validation_result_status, validation_severity } from "@prisma/client";

import {
  evaluateCostLineValidation,
  type CostLineValidateInput,
} from "@/lib/validations/cost-validation";
import {
  evaluateDisciplineValidation,
  type DisciplineValidationInput,
} from "@/lib/validations/discipline-validation";
import { DISCIPLINE_RULE_DEFINITIONS } from "@/lib/validations/discipline-rules";
import {
  evaluateReportingGovernanceWarnings,
  type ReportingGovernanceMetadata,
} from "@/lib/validations/reporting-governance";
import {
  resultStatusForRule,
  VALIDATION_RULE_DEFINITIONS,
  type ValidationRuleCode,
} from "@/lib/validations/validation-rules";

export type EngineValidationFinding = {
  rule_code: ValidationRuleCode;
  target_object_type: string;
  target_object_id: string | null;
  message: string;
  severity: validation_severity;
};

export type PersistableValidationFinding = EngineValidationFinding & {
  result_status: validation_result_status;
};

type ResultStatusRow = Pick<
  { severity: validation_severity; resolved_flag: boolean; result_status: validation_result_status },
  "severity" | "resolved_flag" | "result_status"
>;

export function isOpenWarning(row: ResultStatusRow): boolean {
  return (
    row.severity === "WARNING" &&
    !row.resolved_flag &&
    row.result_status !== "Pass" &&
    row.result_status !== "Overridden"
  );
}

export function countOpenWarnings(rows: ResultStatusRow[]): number {
  return rows.filter(isOpenWarning).length;
}

export function collectCostValidationWarnings(
  lines: CostLineValidateInput[],
): EngineValidationFinding[] {
  const findings: EngineValidationFinding[] = [];

  for (const line of lines) {
    for (const issue of evaluateCostLineValidation(line)) {
      if (issue.severity !== "WARNING") continue;
      findings.push({
        rule_code: issue.rule_code,
        target_object_type: issue.target_object_type,
        target_object_id: issue.target_object_id,
        message: issue.message,
        severity: "WARNING",
      });
    }
  }

  return findings;
}

export function collectDisciplineValidationFindings(
  disciplines: DisciplineValidationInput[],
): EngineValidationFinding[] {
  return evaluateDisciplineValidation(disciplines).map((finding) => {
    const def = DISCIPLINE_RULE_DEFINITIONS[finding.rule_code];
    return {
      rule_code: finding.rule_code,
      target_object_type: def.target_object_type,
      target_object_id: finding.target_object_id,
      message: finding.message,
      severity: def.severity,
    };
  });
}

export function toPersistableFinding(
  finding: EngineValidationFinding,
): PersistableValidationFinding {
  const def = VALIDATION_RULE_DEFINITIONS[finding.rule_code];
  return {
    ...finding,
    severity: def.severity,
    result_status: resultStatusForRule(finding.rule_code),
  };
}

export function collectReportingGovernanceWarnings(
  metadata: ReportingGovernanceMetadata,
  options?: { contentComplete?: boolean },
): EngineValidationFinding[] {
  return evaluateReportingGovernanceWarnings(metadata, options).map((finding) => ({
    rule_code: finding.rule_code,
    target_object_type: finding.target_object_type,
    target_object_id: finding.target_object_id,
    message: finding.message,
    severity: finding.severity,
  }));
}

export function aggregateWarningFindings(input: {
  costLines: CostLineValidateInput[];
  disciplines: DisciplineValidationInput[];
  reportingGovernance?: ReportingGovernanceMetadata | null;
  reportingGovernanceContentComplete?: boolean;
}): PersistableValidationFinding[] {
  const governanceWarnings =
    input.reportingGovernance != null
      ? collectReportingGovernanceWarnings(input.reportingGovernance, {
          contentComplete: input.reportingGovernanceContentComplete ?? true,
        })
      : [];

  return [
    ...collectCostValidationWarnings(input.costLines),
    ...collectDisciplineValidationFindings(input.disciplines),
    ...governanceWarnings,
  ]
    .filter((finding) => finding.severity === "WARNING")
    .map(toPersistableFinding);
}

export function aggregateDisciplineBlockFindings(
  disciplines: DisciplineValidationInput[],
): PersistableValidationFinding[] {
  return collectDisciplineValidationFindings(disciplines)
    .filter((finding) => finding.severity === "BLOCK")
    .map(toPersistableFinding);
}
