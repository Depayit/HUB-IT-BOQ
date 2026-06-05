import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn(async (args: { data: Record<string, unknown> }) => ({
  audit_id: "audit-1",
  ...args.data,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    audit_logs: {
      create: (args: { data: Record<string, unknown> }) => createMock(args),
      findMany: vi.fn(async () => []),
    },
  },
}));

import { auditService } from "@/lib/services/audit.service";
import { AUDIT_ACTION_TYPES } from "@/lib/validations/audit";

const UUID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  createMock.mockClear();
});

describe("audit append wiring", () => {
  it("action types cover workflow events (approve/lock/handoff/update/correction)", () => {
    for (const a of ["approve", "lock", "handoff", "update", "correction"]) {
      expect(AUDIT_ACTION_TYPES).toContain(a);
    }
  });

  it("append maps fields to an append-only audit_logs.create row", async () => {
    await auditService.append({
      object_type: "boq_version",
      object_id: UUID,
      action_type: "approve",
      new_value: "Approved",
      changed_by: "manager-1",
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        object_type: "boq_version",
        object_id: UUID,
        action_type: "approve",
        new_value: "Approved",
        changed_by: "manager-1",
        old_value: null,
        change_reason: null,
      }),
    });
  });

  it("appendCorrection records action_type=correction with reason", async () => {
    await auditService.appendCorrection({
      object_type: "boq_version",
      object_id: UUID,
      changed_by: "director-1",
      reason: "manual fix",
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action_type: "correction",
        change_reason: "manual fix",
      }),
    });
  });

  it("rejects invalid object_id via schema", async () => {
    await expect(
      auditService.append({
        object_type: "boq_version",
        object_id: "not-a-uuid",
        action_type: "create",
        changed_by: "u",
      }),
    ).rejects.toThrow();
  });

  it("assertImmutable guard throws", () => {
    expect(() => auditService.assertImmutable()).toThrow();
  });
});
