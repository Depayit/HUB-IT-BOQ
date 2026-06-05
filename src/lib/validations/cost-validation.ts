import type { validation_severity } from "@prisma/client";

export const COST_VALIDATION_RULE_CODES = [
  "COST_LAYER_MISSING",
  "COST_CATEGORY_DUPLICATE",
  "COST_ZERO_VALUE",
  "COST_OVERRIDE_INVALID",
  "COST_LOW_CONFIDENCE",
] as const;

export type CostValidationRuleCode = (typeof COST_VALIDATION_RULE_CODES)[number];

export type CostBreakdownValidateInput = {
  boq_cost_breakdown_id: string;
  cost_category_id: string;
  category_code: string;
  calculated_value: number;
  confidence_level: string | null;
  manual_override_flag: boolean;
  override_reason: string | null;
};

export type CostLineValidateInput = {
  boq_line_id: string;
  line_no: number;
  item_description: string;
  breakdowns: CostBreakdownValidateInput[];
};

export type CostValidationIssue = {
  rule_code: CostValidationRuleCode;
  target_object_type: "boq_line" | "boq_cost_breakdown";
  target_object_id: string;
  message: string;
  severity: validation_severity;
};

export function isLowConfidence(confidenceLevel: string | null | undefined): boolean {
  return confidenceLevel?.trim().toLowerCase() === "low";
}

export function evaluateCostLineValidation(line: CostLineValidateInput): CostValidationIssue[] {
  const issues: CostValidationIssue[] = [];
  const prefix = `Line ${line.line_no}`;

  if (line.breakdowns.length === 0) {
    issues.push({
      rule_code: "COST_LAYER_MISSING",
      target_object_type: "boq_line",
      target_object_id: line.boq_line_id,
      message: `${prefix}: BOQ line has no cost layer breakdowns`,
      severity: "BLOCK",
    });
    return issues;
  }

  const categoryCounts = new Map<string, number>();
  for (const breakdown of line.breakdowns) {
    categoryCounts.set(
      breakdown.cost_category_id,
      (categoryCounts.get(breakdown.cost_category_id) ?? 0) + 1,
    );
  }

  const duplicateCategoryIds = [...categoryCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (duplicateCategoryIds.length > 0) {
    const codes = [
      ...new Set(
        line.breakdowns
          .filter((b) => duplicateCategoryIds.includes(b.cost_category_id))
          .map((b) => b.category_code),
      ),
    ];
    issues.push({
      rule_code: "COST_CATEGORY_DUPLICATE",
      target_object_type: "boq_line",
      target_object_id: line.boq_line_id,
      message: `${prefix}: duplicate cost categories (${codes.join(", ")})`,
      severity: "BLOCK",
    });
  }

  for (const breakdown of line.breakdowns) {
    const breakdownPrefix = `${prefix} [${breakdown.category_code}]`;

    if (breakdown.calculated_value <= 0) {
      issues.push({
        rule_code: "COST_ZERO_VALUE",
        target_object_type: "boq_cost_breakdown",
        target_object_id: breakdown.boq_cost_breakdown_id,
        message: `${breakdownPrefix}: calculated value must be greater than zero`,
        severity: "BLOCK",
      });
    }

    if (breakdown.manual_override_flag && !breakdown.override_reason?.trim()) {
      issues.push({
        rule_code: "COST_OVERRIDE_INVALID",
        target_object_type: "boq_cost_breakdown",
        target_object_id: breakdown.boq_cost_breakdown_id,
        message: `${breakdownPrefix}: manual override requires override reason`,
        severity: "BLOCK",
      });
    }

    if (isLowConfidence(breakdown.confidence_level)) {
      issues.push({
        rule_code: "COST_LOW_CONFIDENCE",
        target_object_type: "boq_cost_breakdown",
        target_object_id: breakdown.boq_cost_breakdown_id,
        message: `${breakdownPrefix}: confidence level is Low`,
        severity: "WARNING",
      });
    }
  }

  return issues;
}
