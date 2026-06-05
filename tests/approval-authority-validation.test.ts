import { describe, it, expect } from "vitest";
import {
  APPROVAL_AUTHORITY_MASTER,
  APPROVAL_AUTHORITY_ROLES,
} from "@/lib/constants/approval-authority";
import { WORKFLOW_STATE_MASTER } from "@/lib/constants/workflow-states";
import { approvalAuthorityService } from "@/lib/services/approval-authority.service";
import {
  approvalAuthorityQuerySchema,
  assertInvalidRoleBlocked,
  assertRequiredAuthority,
  assertRequiredRole,
} from "@/lib/validations/approval-authority";
import { AppError } from "@/lib/utils/errors";

describe("approval authority validation", () => {
  it("requires role", () => {
    expect(() => assertRequiredRole(undefined)).toThrow(AppError);
    expect(() => assertRequiredRole("")).toThrow(AppError);
  });

  it("blocks invalid role", () => {
    expect(() => assertInvalidRoleBlocked("Admin")).toThrow(AppError);
  });

  it("accepts valid roles", () => {
    for (const role of APPROVAL_AUTHORITY_ROLES) {
      expect(assertRequiredRole(role)).toBe(role);
    }
  });

  it("requires authority for role at workflow state", () => {
    const draft = WORKFLOW_STATE_MASTER.find((s) => s.workflow_code === "DRAFT")!;
    expect(() =>
      assertRequiredAuthority(draft.workflow_state_id, "Manager"),
    ).toThrow(AppError);
  });

  it("accepts authority query when role and authority exist", () => {
    const draft = WORKFLOW_STATE_MASTER.find((s) => s.workflow_code === "DRAFT")!;
    const result = approvalAuthorityQuerySchema.safeParse({
      workflow_state_id: draft.workflow_state_id,
      role_code: "Engineer",
    });
    expect(result.success).toBe(true);
  });
});

describe("approval authority service", () => {
  it("exposes authority matrix rows", () => {
    expect(APPROVAL_AUTHORITY_MASTER.length).toBeGreaterThan(0);
  });

  it("grants engineer approve at draft", () => {
    const draft = WORKFLOW_STATE_MASTER.find((s) => s.workflow_code === "DRAFT")!;
    expect(approvalAuthorityService.canApprove(draft.workflow_state_id, "Engineer")).toBe(true);
    expect(approvalAuthorityService.getActionTargetState(draft.workflow_state_id, "Engineer", "approve")).toBe(
      "UNDER_REVIEW",
    );
  });

  it("grants manager approve at under review", () => {
    const underReview = WORKFLOW_STATE_MASTER.find((s) => s.workflow_code === "UNDER_REVIEW")!;
    expect(approvalAuthorityService.canApprove(underReview.workflow_state_id, "Manager")).toBe(true);
    expect(approvalAuthorityService.canReturn(underReview.workflow_state_id, "Manager")).toBe(true);
  });

  it("grants director lock at approved", () => {
    const approved = WORKFLOW_STATE_MASTER.find((s) => s.workflow_code === "APPROVED")!;
    expect(approvalAuthorityService.canLock(approved.workflow_state_id, "Director")).toBe(true);
    expect(approvalAuthorityService.getActionTargetState(approved.workflow_state_id, "Director", "lock")).toBe(
      "LOCKED",
    );
  });
});
