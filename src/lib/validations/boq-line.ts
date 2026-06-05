import { z } from "zod";

export const boqLineSchema = z.object({
  project_discipline_id: z.string().uuid(),
  item_id: z.string().max(64).optional().nullable(),
  line_no: z.number().int().positive().optional(),
  item_description: z.string().min(1),
  unit: z.string().min(1).max(32),
  quantity: z.number().positive(),
  cost_source: z.string().max(64).optional().nullable(),
  confidence_level: z.string().max(32).optional().nullable(),
  is_critical_line: z.boolean(),
  notes: z.string().optional().nullable(),
});

export type BoqLineInput = z.infer<typeof boqLineSchema>;
