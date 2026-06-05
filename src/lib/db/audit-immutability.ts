import { AppError } from "@/lib/utils/errors";

export const AUDIT_IMMUTABLE_CODE = "AUDIT_IMMUTABLE";

export const AUDIT_IMMUTABLE_MESSAGE =
  "Audit logs are append-only — use appendCorrection for corrections";

/** Prisma operations blocked on audit_logs */
export const BLOCKED_AUDIT_MUTATIONS = [
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
] as const;

export type BlockedAuditMutation = (typeof BLOCKED_AUDIT_MUTATIONS)[number];

export function isBlockedAuditMutation(operation: string): operation is BlockedAuditMutation {
  return (BLOCKED_AUDIT_MUTATIONS as readonly string[]).includes(operation);
}

export function assertAuditMutationAllowed(operation: string): void {
  if (!isBlockedAuditMutation(operation)) return;
  throw new AppError(
    `${AUDIT_IMMUTABLE_MESSAGE} (${operation})`,
    AUDIT_IMMUTABLE_CODE,
    403,
  );
}

export function createAuditImmutabilityGuard() {
  return {
    query: {
      audit_logs: {
        async $allOperations({
          operation,
          args,
          query,
        }: {
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          assertAuditMutationAllowed(operation);
          return query(args);
        },
      },
    },
  };
}
