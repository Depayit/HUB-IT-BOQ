import {
  APPROVAL_ACTION_TARGETS,
  APPROVAL_AUTHORITY_MASTER,
  getApprovalAuthority,
  type ApprovalAuthorityRole,
  type ApprovalAuthorityRow,
} from "@/lib/constants/approval-authority";
import {
  getWorkflowStateById,
  type WorkflowStateCode,
} from "@/lib/constants/workflow-states";
import {
  assertInvalidRoleBlocked,
  assertRequiredAuthority,
  assertRequiredRole,
} from "@/lib/validations/approval-authority";
import { AppError } from "@/lib/utils/errors";

export const approvalAuthorityService = {
  listAuthorities(): ApprovalAuthorityRow[] {
    return [...APPROVAL_AUTHORITY_MASTER];
  },

  getAuthority(
    workflowStateId: string,
    roleCode: ApprovalAuthorityRole | string,
  ): ApprovalAuthorityRow | null {
    const role = assertRequiredRole(roleCode);
    return getApprovalAuthority(workflowStateId, role) ?? null;
  },

  canApprove(workflowStateId: string, roleCode: ApprovalAuthorityRole | string): boolean {
    const authority = this.getAuthorityRecord(workflowStateId, roleCode);
    return authority?.can_approve ?? false;
  },

  canReturn(workflowStateId: string, roleCode: ApprovalAuthorityRole | string): boolean {
    const authority = this.getAuthorityRecord(workflowStateId, roleCode);
    return authority?.can_return ?? false;
  },

  canReject(workflowStateId: string, roleCode: ApprovalAuthorityRole | string): boolean {
    const authority = this.getAuthorityRecord(workflowStateId, roleCode);
    return authority?.can_reject ?? false;
  },

  canLock(workflowStateId: string, roleCode: ApprovalAuthorityRole | string): boolean {
    const authority = this.getAuthorityRecord(workflowStateId, roleCode);
    return authority?.can_lock ?? false;
  },

  getActionTargetState(
    workflowStateId: string,
    roleCode: ApprovalAuthorityRole | string,
    action: "approve" | "return" | "reject" | "lock",
  ): WorkflowStateCode | null {
    const authority = this.getAuthorityRecord(workflowStateId, roleCode);
    if (!authority) return null;

    const permissionKey =
      action === "approve"
        ? "can_approve"
        : action === "return"
          ? "can_return"
          : action === "reject"
            ? "can_reject"
            : "can_lock";

    if (!authority[permissionKey]) return null;

    const state = getWorkflowStateById(workflowStateId);
    if (!state) return null;

    return APPROVAL_ACTION_TARGETS[action][state.workflow_code] ?? null;
  },

  assertCanPerform(
    workflowStateId: string,
    roleCode: ApprovalAuthorityRole | string,
    action: "approve" | "return" | "reject" | "lock",
  ): WorkflowStateCode {
    const role = assertRequiredRole(roleCode);
    assertRequiredAuthority(workflowStateId, role);

    const allowed =
      action === "approve"
        ? this.canApprove(workflowStateId, role)
        : action === "return"
          ? this.canReturn(workflowStateId, role)
          : action === "reject"
            ? this.canReject(workflowStateId, role)
            : this.canLock(workflowStateId, role);

    if (!allowed) {
      throw new AppError(
        `Role ${role} ไม่มีสิทธิ์ ${action} ใน workflow state นี้`,
        "UNAUTHORIZED_ACTION",
        403,
      );
    }

    const target = this.getActionTargetState(workflowStateId, role, action);
    if (!target) {
      throw new AppError(
        `ไม่พบ target state สำหรับ action ${action}`,
        "UNDEFINED_ACTION_TARGET",
        400,
      );
    }

    return target;
  },

  getAuthorityRecord(
    workflowStateId: string,
    roleCode: ApprovalAuthorityRole | string,
  ): ApprovalAuthorityRow | null {
    assertInvalidRoleBlocked(roleCode);
    return getApprovalAuthority(workflowStateId, roleCode as ApprovalAuthorityRole) ?? null;
  },
};
