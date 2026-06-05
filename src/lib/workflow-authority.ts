import { AppError } from "@/lib/utils/errors";

export const APPROVAL_ROLES = ["Engineer", "Manager", "Director"] as const;
export type ApprovalRole = (typeof APPROVAL_ROLES)[number];

export const WORKFLOW_STAGES = [
  "Engineer Review",
  "Manager Approval",
  "Director Approval",
  "Final Lock",
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

/** Role required to advance FROM the given current stage */
const STAGE_ADVANCE_ROLE: Record<WorkflowStage, ApprovalRole> = {
  "Engineer Review": "Engineer",
  "Manager Approval": "Manager",
  "Director Approval": "Director",
  "Final Lock": "Director",
};

/** Role required to initiate workflow (no record yet) */
export const INITIATE_WORKFLOW_ROLE: ApprovalRole = "Engineer";

export function isApprovalRole(value: string): value is ApprovalRole {
  return (APPROVAL_ROLES as readonly string[]).includes(value);
}

export function isWorkflowStage(value: string): value is WorkflowStage {
  return (WORKFLOW_STAGES as readonly string[]).includes(value);
}

export function getRequiredRoleForStage(stage: WorkflowStage | null): ApprovalRole {
  return stage ? STAGE_ADVANCE_ROLE[stage] : INITIATE_WORKFLOW_ROLE;
}

export function assertRoleForStage(
  currentStage: WorkflowStage | null,
  actorRole: ApprovalRole,
): void {
  const required = currentStage ? STAGE_ADVANCE_ROLE[currentStage] : INITIATE_WORKFLOW_ROLE;
  if (actorRole !== required) {
    throw new AppError(
      `Role ${actorRole} ไม่มีสิทธิ์ดำเนินการขั้น ${currentStage ?? "เริ่ม workflow"} — ต้องใช้ ${required}`,
      "UNAUTHORIZED_ROLE",
      403,
    );
  }
}

export function getNextStage(
  currentStage: WorkflowStage | null,
): WorkflowStage | null {
  if (!currentStage) return "Engineer Review";
  const idx = WORKFLOW_STAGES.indexOf(currentStage);
  if (idx < 0 || idx >= WORKFLOW_STAGES.length - 1) return null;
  return WORKFLOW_STAGES[idx + 1];
}

export function isValidTransition(
  from: WorkflowStage | null,
  to: WorkflowStage,
): boolean {
  const expected = getNextStage(from);
  return expected === to;
}
