import { prisma } from "@/lib/db/prisma";
import { AUDIT_IMMUTABLE_CODE, AUDIT_IMMUTABLE_MESSAGE } from "@/lib/db/audit-immutability";
import { AppError } from "@/lib/utils/errors";
import {
  auditAppendSchema,
  auditCorrectionSchema,
  type AuditAppendInput,
  type AuditCorrectionInput,
} from "@/lib/validations/audit";

/**
 * Append-only audit service.
 * Application layer MUST NOT update or delete audit_logs records.
 * Corrections are recorded as new events with action_type = correction.
 */
export const auditService = {
  async append(input: AuditAppendInput) {
    const data = auditAppendSchema.parse(input);
    return prisma.audit_logs.create({
      data: {
        object_type: data.object_type,
        object_id: data.object_id,
        action_type: data.action_type,
        old_value: data.old_value ?? null,
        new_value: data.new_value ?? null,
        changed_by: data.changed_by,
        change_reason: data.change_reason ?? null,
      },
    });
  },

  async appendCorrection(input: AuditCorrectionInput) {
    const data = auditCorrectionSchema.parse(input);
    return this.append({
      object_type: data.object_type,
      object_id: data.object_id,
      action_type: "correction",
      old_value: data.old_value,
      new_value: data.new_value,
      changed_by: data.changed_by,
      change_reason: data.reason,
    });
  },

  async listByObject(objectType: string, objectId: string) {
    return prisma.audit_logs.findMany({
      where: { object_type: objectType, object_id: objectId },
      orderBy: { changed_at: "asc" },
    });
  },

  /** Guard — audit records are immutable; corrections use appendCorrection(). */
  assertImmutable(): never {
    throw new AppError(AUDIT_IMMUTABLE_MESSAGE, AUDIT_IMMUTABLE_CODE, 403);
  },
};
