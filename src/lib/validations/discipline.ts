import { z } from "zod";

export const RISK_LEVELS = ["Low", "Medium", "High", "Critical"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

const optionalText = z
  .string()
  .max(5000)
  .optional()
  .nullable()
  .transform((v) => (v?.trim() ? v.trim() : null));

export const saveProjectDisciplineSchema = z.object({
  discipline_id: z.string().uuid("ต้องเลือก discipline"),
  project_id: z.string().uuid(),
  boq_version_id: z.string().uuid(),
  included_flag: z.boolean().default(false),
  scope_description: optionalText,
  exclusion_note: optionalText,
  risk_level: z.enum(RISK_LEVELS, {
    errorMap: () => ({ message: "Risk level ต้องเป็น Low, Medium, High หรือ Critical" }),
  }),
});

export const updateProjectDisciplineSchema = z.object({
  project_discipline_id: z.string().uuid(),
  included_flag: z.boolean(),
  scope_description: optionalText,
  exclusion_note: optionalText,
  risk_level: z.enum(RISK_LEVELS, {
    errorMap: () => ({ message: "Risk level ต้องเป็น Low, Medium, High หรือ Critical" }),
  }),
});

export type SaveProjectDisciplineInput = z.infer<typeof saveProjectDisciplineSchema>;
export type UpdateProjectDisciplineInput = z.infer<typeof updateProjectDisciplineSchema>;
