import { z } from "zod";

import { AppError } from "@/lib/utils/errors";

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

/** Error code when handoff is attempted without a required target (M-06 / SIM-007). */
export const HANDOFF_TARGET_REQUIRED_CODE = "HANDOFF_TARGET_REQUIRED";

/** Rejects null/undefined/invalid handoff_target before persisting a handoff record. */
export function assertHandoffTargetProvided(
  handoffTarget?: HandoffTarget | null,
): asserts handoffTarget is HandoffTarget {
  if (!isHandoffTarget(handoffTarget)) {
    throw new AppError(
      "Handoff ต้องระบุ handoff_target (Procurement, Construction, ClientHandover)",
      HANDOFF_TARGET_REQUIRED_CODE,
      403,
    );
  }
}
