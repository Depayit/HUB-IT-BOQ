import { z } from "zod";

const projectStatusEnum = z.enum(["Active", "OnHold", "Archived"]);

export const projectSetupSchema = z.object({
  client_id: z.string().max(64).optional().nullable(),
  opportunity_id: z.string().max(64).optional().nullable(),
  project_name: z.string().min(1, "กรุณาระบุชื่อโปรเจกต์").max(255),
  location: z.string().max(255).optional().nullable(),
  project_type: z.string().max(64).optional().nullable(),
  it_load_kw: z.coerce.number().positive("IT Load ต้องมากกว่า 0"),
  rack_count: z.coerce.number().int().positive("จำนวน Rack ต้องมากกว่า 0"),
  tier_target: z.string().max(32).optional().nullable(),
  sla_target: z.string().max(64).optional().nullable(),
  currency: z.string().max(8),
  vat_option: z.string().max(32).optional().nullable(),
  project_status: projectStatusEnum,
});

export const projectUpdateSchema = projectSetupSchema;

export type ProjectSetupInput = z.infer<typeof projectSetupSchema>;
