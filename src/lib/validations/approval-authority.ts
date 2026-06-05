import { z } from "zod";
import {
  APPROVAL_AUTHORITY_ROLES,
  getApprovalAuthority,
  type ApprovalAuthorityRole,
  type ApprovalAuthorityRow,
} from "@/lib/constants/approval-authority";
import { getWorkflowStateById } from "@/lib/constants/workflow-states";
import { AppError } from "@/lib/utils/errors";

export { APPROVAL_AUTHORITY_ROLES, type ApprovalAuthorityRole };

export const approvalAuthorityRoleSchema = z.enum(APPROVAL_AUTHORITY_ROLES, {
  errorMap: () => ({
    message: "Role ต้องเป็น Engineer, Manager หรือ Director",
  }),
});

export const approvalAuthorityQuerySchema = z.object({
  workflow_state_id: z.string().uuid("ต้องระบุ workflow_state_id"),
  role_code: approvalAuthorityRoleSchema,
});

export type ApprovalAuthorityQuery = z.infer<typeof approvalAuthorityQuerySchema>;

export function isApprovalAuthorityRole(value: string): value is ApprovalAuthorityRole {
  return (APPROVAL_AUTHORITY_ROLES as readonly string[]).includes(value);
}

export function assertRequiredRole(roleCode: string | null | undefined): ApprovalAuthorityRole {
  if (roleCode == null || roleCode.trim() === "") {
    throw new AppError("ต้องระบุ role", "ROLE_REQUIRED", 400);
  }

  if (!isApprovalAuthorityRole(roleCode)) {
    throw new AppError(
      `Role "${roleCode}" ไม่ถูกต้อง — ต้องเป็น Engineer, Manager หรือ Director`,
      "INVALID_ROLE",
      403,
    );
  }

  return roleCode;
}

export function assertRequiredAuthority(
  workflowStateId: string,
  roleCode: ApprovalAuthorityRole,
): ApprovalAuthorityRow {
  assertValidWorkflowStateById(workflowStateId);

  const authority = getApprovalAuthority(workflowStateId, roleCode);
  if (!authority) {
    throw new AppError(
      `ไม่พบ authority สำหรับ role ${roleCode} ใน workflow state นี้`,
      "AUTHORITY_REQUIRED",
      403,
    );
  }

  return authority;
}

function assertValidWorkflowStateById(workflowStateId: string): void {
  if (!workflowStateId?.trim()) {
    throw new AppError("ต้องระบุ workflow_state_id", "WORKFLOW_STATE_REQUIRED", 400);
  }

  if (!getWorkflowStateById(workflowStateId)) {
    throw new AppError(
      `Workflow state id "${workflowStateId}" ไม่พบใน master`,
      "UNDEFINED_WORKFLOW_STATE",
      404,
    );
  }
}

export function parseApprovalAuthorityQuery(input: unknown): ApprovalAuthorityQuery {
  const parsed = approvalAuthorityQuerySchema.parse(input);
  assertRequiredRole(parsed.role_code);
  assertRequiredAuthority(parsed.workflow_state_id, parsed.role_code);
  return parsed;
}

export function assertInvalidRoleBlocked(roleCode: string): void {
  assertRequiredRole(roleCode);
}
