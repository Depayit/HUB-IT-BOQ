import { z } from "zod";

export const CALCULATION_METHODS = ["unit_rate", "fixed", "percent_of_base"] as const;

export const costBreakdownFormSchema = z
  .object({
    cost_category_id: z.string().uuid("เลือก cost category"),
    calculation_method: z.string().min(1).max(64),
    base_value: z.coerce.number().min(0),
    rate: z.coerce.number().min(0),
    quantity_factor: z.coerce.number().min(0).default(1),
    cost_source: z.string().max(64).optional().or(z.literal("")),
    confidence_level: z.string().max(32).optional().or(z.literal("")),
    manual_override_flag: z.boolean().default(false),
    override_reason: z.string().max(2000).optional().or(z.literal("")),
    override_calculated_value: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.manual_override_flag) {
      if (!data.override_reason?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ต้องระบุ override reason",
          path: ["override_reason"],
        });
      }
      if (data.override_calculated_value == null || data.override_calculated_value < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ต้องระบุ calculated value สำหรับ manual override",
          path: ["override_calculated_value"],
        });
      }
    }
  });

export type CostBreakdownFormValues = z.infer<typeof costBreakdownFormSchema>;

export function computeCalculatedValue(input: {
  base_value: number;
  rate: number;
  quantity_factor: number;
}): number {
  return input.base_value * input.rate * input.quantity_factor;
}

export function resolveCalculatedValue(input: CostBreakdownFormValues): number {
  if (input.manual_override_flag && input.override_calculated_value != null) {
    return input.override_calculated_value;
  }
  return computeCalculatedValue({
    base_value: input.base_value,
    rate: input.rate,
    quantity_factor: input.quantity_factor,
  });
}

export type CostBreakdownPersistInput = {
  cost_category_id: string;
  calculation_method: string;
  base_value: number;
  rate: number;
  quantity_factor: number;
  calculated_value: number;
  cost_source: string | null;
  confidence_level: string | null;
  manual_override_flag: boolean;
  override_reason: string | null;
};

export function toPersistInput(form: CostBreakdownFormValues): CostBreakdownPersistInput {
  return {
    cost_category_id: form.cost_category_id,
    calculation_method: form.calculation_method,
    base_value: form.base_value,
    rate: form.rate,
    quantity_factor: form.quantity_factor,
    calculated_value: resolveCalculatedValue(form),
    cost_source: form.cost_source?.trim() || null,
    confidence_level: form.confidence_level?.trim() || null,
    manual_override_flag: form.manual_override_flag,
    override_reason: form.manual_override_flag ? form.override_reason?.trim() || null : null,
  };
}

export function toFormValues(row: {
  cost_category_id: string;
  calculation_method: string;
  base_value: number;
  rate: number;
  quantity_factor: number;
  calculated_value: number;
  cost_source: string | null;
  confidence_level: string | null;
  manual_override_flag: boolean;
  override_reason: string | null;
}): CostBreakdownFormValues {
  return {
    cost_category_id: row.cost_category_id,
    calculation_method: row.calculation_method,
    base_value: row.base_value,
    rate: row.rate,
    quantity_factor: row.quantity_factor,
    cost_source: row.cost_source ?? "",
    confidence_level: row.confidence_level ?? "",
    manual_override_flag: row.manual_override_flag,
    override_reason: row.override_reason ?? "",
    override_calculated_value: row.manual_override_flag ? row.calculated_value : undefined,
  };
}
