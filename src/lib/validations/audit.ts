import { z } from "zod";

export const AUDIT_ACTION_TYPES = [
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "lock",
  "override",
  "handoff",
  "correction",
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

export const auditAppendSchema = z.object({
  object_type: z.string().min(1).max(64),
  object_id: z.string().uuid(),
  action_type: z.enum(AUDIT_ACTION_TYPES),
  old_value: z.string().nullable().optional(),
  new_value: z.string().nullable().optional(),
  changed_by: z.string().min(1).max(128),
  change_reason: z.string().nullable().optional(),
});

export type AuditAppendInput = z.infer<typeof auditAppendSchema>;

export const auditCorrectionSchema = z.object({
  object_type: z.string().min(1).max(64),
  object_id: z.string().uuid(),
  old_value: z.string().nullable().optional(),
  new_value: z.string().nullable().optional(),
  changed_by: z.string().min(1).max(128),
  reason: z.string().min(1, "Correction requires a reason"),
});

export type AuditCorrectionInput = z.infer<typeof auditCorrectionSchema>;
