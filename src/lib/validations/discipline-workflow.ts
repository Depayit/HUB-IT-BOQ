import { RISK_LEVELS, type RiskLevel } from "@/lib/validations/discipline";
import {
  DISCIPLINE_RULE_DEFINITIONS,
  type DisciplineRuleCode,
} from "@/lib/validations/discipline-rules";

export type DisciplineWorkflowStatus = "Included" | "Excluded" | "Pending" | "Blocked";

export type DisciplineValidationInput = {
  project_discipline_id: string;
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  included_flag: boolean;
  scope_description: string | null;
  exclusion_note: string | null;
  risk_level: string;
  boq_line_count: number;
};

export type DisciplineValidationFinding = {
  rule_code: DisciplineRuleCode;
  severity: "BLOCK" | "WARNING";
  target_object_id: string;
  message: string;
};

const RISK_LEVEL_SET = new Set<string>(RISK_LEVELS);

export function isValidRiskLevel(value: string): value is RiskLevel {
  return RISK_LEVEL_SET.has(value);
}

export function deriveDisciplineWorkflowStatus(
  row: Pick<DisciplineValidationInput, "included_flag" | "boq_line_count" | "exclusion_note">,
): DisciplineWorkflowStatus {
  if (row.included_flag) {
    return row.boq_line_count > 0 ? "Included" : "Blocked";
  }
  if (row.exclusion_note?.trim()) return "Excluded";
  return "Pending";
}

function finding(
  rule_code: DisciplineRuleCode,
  target_object_id: string,
  message: string,
): DisciplineValidationFinding {
  const def = DISCIPLINE_RULE_DEFINITIONS[rule_code];
  const severity = def.severity === "WARNING" ? "WARNING" : "BLOCK";
  return { rule_code, severity, target_object_id, message };
}

export function evaluateDisciplineValidation(
  disciplines: DisciplineValidationInput[],
): DisciplineValidationFinding[] {
  const findings: DisciplineValidationFinding[] = [];
  const byDisciplineId = new Map<string, DisciplineValidationInput[]>();

  for (const row of disciplines) {
    const list = byDisciplineId.get(row.discipline_id) ?? [];
    list.push(row);
    byDisciplineId.set(row.discipline_id, list);
  }

  for (const [, rows] of byDisciplineId) {
    if (rows.length > 1) {
      for (const row of rows) {
        findings.push(
          finding(
            "DISCIPLINE_DUPLICATE",
            row.project_discipline_id,
            `${row.discipline_code} (${row.discipline_name}): duplicate discipline assignment`,
          ),
        );
      }
    }
  }

  for (const row of disciplines) {
    if (!isValidRiskLevel(row.risk_level)) {
      findings.push(
        finding(
          "DISCIPLINE_INVALID_RISK",
          row.project_discipline_id,
          `${row.discipline_code}: invalid risk level "${row.risk_level}"`,
        ),
      );
    }

    if (row.included_flag && row.boq_line_count === 0) {
      findings.push(
        finding(
          "DISCIPLINE_NO_LINES",
          row.project_discipline_id,
          `${row.discipline_code} (${row.discipline_name}): included discipline must have at least one BOQ line`,
        ),
      );
    }

    if (row.included_flag && !row.scope_description?.trim()) {
      findings.push(
        finding(
          "DISCIPLINE_MISSING_SCOPE",
          row.project_discipline_id,
          `${row.discipline_code}: missing scope description`,
        ),
      );
    }

    if (row.risk_level === "Critical" && row.included_flag && !row.scope_description?.trim()) {
      findings.push(
        finding(
          "DISCIPLINE_CRITICAL_NO_RISK",
          row.project_discipline_id,
          `${row.discipline_code}: critical discipline without risk assessment (scope description)`,
        ),
      );
    }
  }

  return findings;
}
