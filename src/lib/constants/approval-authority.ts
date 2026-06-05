import {
  WORKFLOW_STATE_MASTER,
  type WorkflowStateCode,
} from "@/lib/constants/workflow-states";

/** Approval roles (Engineer, Manager, Director) */
export const APPROVAL_AUTHORITY_ROLES = ["Engineer", "Manager", "Director"] as const;

export type ApprovalAuthorityRole = (typeof APPROVAL_AUTHORITY_ROLES)[number];

export type ApprovalAuthorityRow = {
  authority_id: string;
  workflow_state_id: string;
  role_code: ApprovalAuthorityRole;
  can_approve: boolean;
  can_return: boolean;
  can_reject: boolean;
  can_lock: boolean;
};

function stateId(code: WorkflowStateCode): string {
  const row = WORKFLOW_STATE_MASTER.find((s) => s.workflow_code === code);
  if (!row) {
    throw new Error(`Workflow state ${code} not found`);
  }
  return row.workflow_state_id;
}

/**
 * Authority matrix:
 *   Draft        → Engineer Review      → Under Review
 *   Under Review → Manager Approval     → Approved / Returned
 *   Approved     → Director Approval    → Locked
 */
export const APPROVAL_AUTHORITY_MASTER: ApprovalAuthorityRow[] = [
  {
    authority_id: "20000000-0000-4000-8000-000000000001",
    workflow_state_id: stateId("DRAFT"),
    role_code: "Engineer",
    can_approve: true,
    can_return: false,
    can_reject: false,
    can_lock: false,
  },
  {
    authority_id: "20000000-0000-4000-8000-000000000002",
    workflow_state_id: stateId("UNDER_REVIEW"),
    role_code: "Manager",
    can_approve: true,
    can_return: true,
    can_reject: true,
    can_lock: false,
  },
  {
    authority_id: "20000000-0000-4000-8000-000000000003",
    workflow_state_id: stateId("UNDER_REVIEW"),
    role_code: "Engineer",
    can_approve: false,
    can_return: true,
    can_reject: false,
    can_lock: false,
  },
  {
    authority_id: "20000000-0000-4000-8000-000000000004",
    workflow_state_id: stateId("RETURNED"),
    role_code: "Engineer",
    can_approve: true,
    can_return: false,
    can_reject: false,
    can_lock: false,
  },
  {
    authority_id: "20000000-0000-4000-8000-000000000005",
    workflow_state_id: stateId("APPROVED"),
    role_code: "Director",
    can_approve: false,
    can_return: false,
    can_reject: false,
    can_lock: true,
  },
];

/** Target workflow state for each authority action */
export const APPROVAL_ACTION_TARGETS: Record<
  "approve" | "return" | "reject" | "lock",
  Partial<Record<WorkflowStateCode, WorkflowStateCode>>
> = {
  approve: {
    DRAFT: "UNDER_REVIEW",
    UNDER_REVIEW: "APPROVED",
    RETURNED: "UNDER_REVIEW",
  },
  return: {
    UNDER_REVIEW: "RETURNED",
  },
  reject: {
    UNDER_REVIEW: "RETURNED",
  },
  lock: {
    APPROVED: "LOCKED",
  },
};

export function getApprovalAuthority(
  workflowStateId: string,
  roleCode: ApprovalAuthorityRole,
): ApprovalAuthorityRow | undefined {
  return APPROVAL_AUTHORITY_MASTER.find(
    (row) => row.workflow_state_id === workflowStateId && row.role_code === roleCode,
  );
}
