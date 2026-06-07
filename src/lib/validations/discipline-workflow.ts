import {
  evaluateDisciplineValidation,
  isValidRiskLevel,
  type DisciplineValidationFinding,
  type DisciplineValidationInput,
} from "@/lib/validations/discipline-validation";

export type DisciplineWorkflowStatus = "Included" | "Excluded" | "Pending" | "Blocked";

export type { DisciplineValidationFinding, DisciplineValidationInput };

export { evaluateDisciplineValidation, isValidRiskLevel };

export function deriveDisciplineWorkflowStatus(
  row: Pick<DisciplineValidationInput, "included_flag" | "boq_line_count" | "exclusion_note">,
): DisciplineWorkflowStatus {
  if (row.included_flag) {
    return row.boq_line_count > 0 ? "Included" : "Blocked";
  }
  if (row.exclusion_note?.trim()) return "Excluded";
  return "Pending";
}
