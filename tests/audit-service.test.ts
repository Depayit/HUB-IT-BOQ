import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  AUDIT_IMMUTABLE_CODE,
  AUDIT_IMMUTABLE_MESSAGE,
  BLOCKED_AUDIT_MUTATIONS,
  assertAuditMutationAllowed,
  createAuditImmutabilityGuard,
  isBlockedAuditMutation,
} from "@/lib/db/audit-immutability";
import { AppError } from "@/lib/utils/errors";

const createMock = vi.fn(async (payload: { data: Record<string, unknown> }) => ({
  audit_log_id: "00000000-0000-0000-0000-000000000001",
  ...payload.data,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    audit_logs: {
      create: (payload: { data: Record<string, unknown> }) => createMock(payload),
    },
  },
}));

import { auditService } from "@/lib/services/audit.service";

describe("auditService.append (TD-7A-004 contract)", () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it("appends a row with normalized payload (no fabricated columns)", async () => {
    const objectId = "11111111-1111-1111-1111-111111111111";
    await auditService.append({
      object_type: "boq_version",
      object_id: objectId,
      action_type: "approve",
      new_value: "Engineer Review",
      changed_by: "engineer-001@s7b-0",
      change_reason: "Advance to Engineer Review by Engineer",
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0];
    expect(arg.data).toMatchObject({
      object_type: "boq_version",
      object_id: objectId,
      action_type: "approve",
      old_value: null,
      new_value: "Engineer Review",
      changed_by: "engineer-001@s7b-0",
      change_reason: "Advance to Engineer Review by Engineer",
    });
  });

  it("appends a correction as a new row with action_type=correction (no update)", async () => {
    const objectId = "22222222-2222-2222-2222-222222222222";
    await auditService.appendCorrection({
      object_type: "boq_version",
      object_id: objectId,
      old_value: "Director Approval",
      new_value: "Manager Approval",
      changed_by: "qa-001@s7b-0",
      reason: "Mis-routed approval — corrected back to Manager Approval",
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0];
    expect(arg.data.action_type).toBe("correction");
    expect(arg.data.old_value).toBe("Director Approval");
    expect(arg.data.new_value).toBe("Manager Approval");
    expect(arg.data.change_reason).toContain("Mis-routed");
  });

  it("rejects malformed append payload via Zod (no DB call)", async () => {
    await expect(
      auditService.append({
        // @ts-expect-error — runtime contract test
        object_type: "",
        object_id: "not-a-uuid",
        action_type: "approve",
        changed_by: "",
      }),
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("audit immutability guard (TD-7A-004 contract)", () => {
  it("blocks every mutation operation listed in BLOCKED_AUDIT_MUTATIONS", () => {
    for (const op of BLOCKED_AUDIT_MUTATIONS) {
      expect(isBlockedAuditMutation(op)).toBe(true);
      expect(() => assertAuditMutationAllowed(op)).toThrow(AppError);
      try {
        assertAuditMutationAllowed(op);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe(AUDIT_IMMUTABLE_CODE);
        expect((err as AppError).status).toBe(403);
        expect((err as AppError).message).toContain(AUDIT_IMMUTABLE_MESSAGE);
        expect((err as AppError).message).toContain(op);
      }
    }
  });

  it("allows non-mutation operations (findMany, count, create) through", () => {
    for (const op of ["findMany", "findUnique", "count", "create", "aggregate"]) {
      expect(isBlockedAuditMutation(op)).toBe(false);
      expect(() => assertAuditMutationAllowed(op)).not.toThrow();
    }
  });

  it("Prisma extension routes audit_logs operations through assertAuditMutationAllowed", async () => {
    const guard = createAuditImmutabilityGuard();

    // Allowed op: should pass through and call query()
    const allowedQuery = vi.fn(async () => "ok");
    const allowedResult = await guard.query.audit_logs.$allOperations({
      operation: "create",
      args: { data: {} },
      query: allowedQuery,
    });
    expect(allowedResult).toBe("ok");
    expect(allowedQuery).toHaveBeenCalledTimes(1);

    // Blocked op: should throw before reaching query()
    const blockedQuery = vi.fn(async () => "should-not-run");
    await expect(
      guard.query.audit_logs.$allOperations({
        operation: "update",
        args: { data: {} },
        query: blockedQuery,
      }),
    ).rejects.toThrow(AppError);
    expect(blockedQuery).not.toHaveBeenCalled();
  });
});
