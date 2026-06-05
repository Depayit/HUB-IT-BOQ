import { z } from "zod";

export const HANDOFF_TARGETS = [
  "Procurement",
  "Construction",
  "ClientHandover",
] as const;

export type HandoffTarget = (typeof HANDOFF_TARGETS)[number];

export const createHandoffSchema = z.object({
  handed_off_by: z.string().min(1, "ต้องระบุผู้ดำเนินการ").max(128),
  handoff_target: z.enum(HANDOFF_TARGETS).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type CreateHandoffInput = z.infer<typeof createHandoffSchema>;

export function isHandoffTarget(value: string): value is HandoffTarget {
  return (HANDOFF_TARGETS as readonly string[]).includes(value);
}
