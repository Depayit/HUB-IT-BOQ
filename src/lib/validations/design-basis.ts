import { z } from "zod";

export const designBasisSchema = z.object({
  it_load_assumption_kw: z.coerce.number().positive("IT Load ต้องมากกว่า 0"),
  rack_count_assumption: z.coerce.number().int().positive("จำนวน Rack ต้องมากกว่า 0"),
  power_architecture: z.string().optional().nullable(),
  cooling_architecture: z.string().optional().nullable(),
  fire_protection_assumption: z.string().optional().nullable(),
  monitoring_assumption: z.string().optional().nullable(),
  redundancy_assumption: z.string().optional().nullable(),
  technical_compliance_basis: z.string().optional().nullable(),
  customer_requirement_reference: z.string().max(255).optional().nullable(),
});

export const designBasisStatusActionSchema = z.object({
  design_basis_version_id: z.string().uuid(),
  action: z.enum(["submit", "approve", "reject"]),
  comment: z.string().optional(),
});

export type DesignBasisInput = z.infer<typeof designBasisSchema>;
export type DesignBasisStatusAction = z.infer<typeof designBasisStatusActionSchema>;
export type DesignApprovalStatus = "Draft" | "InReview" | "Approved" | "Rejected";
