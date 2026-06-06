import { z } from "zod";

/**
 * TD-7A-010 — Handoff target SSOT
 *
 * Mirrors the `handoff_target` Prisma enum on `handoff_records`. Service /
 * actions accept these values; null is allowed for backwards compatibility
 * (older rows pre-dating this schema).
 */
export const HANDOFF_TARGETS = [
  "Procurement",
  "Construction",
  "ClientHandover",
] as const;

export type HandoffTarget = (typeof HANDOFF_TARGETS)[number];

export const handoffTargetSchema = z.enum(HANDOFF_TARGETS);

export const handoffTargetOptionalSchema = handoffTargetSchema.optional().nullable();

export const handoffPayloadSchema = z.object({
  boq_version_id: z.string().uuid(),
  handed_off_by: z.string().min(1).max(128),
  notes: z.string().max(2000).optional().nullable(),
  handoff_target: handoffTargetOptionalSchema,
});

export type HandoffPayload = z.infer<typeof handoffPayloadSchema>;

export function isHandoffTarget(value: unknown): value is HandoffTarget {
  return typeof value === "string" && (HANDOFF_TARGETS as readonly string[]).includes(value);
}
