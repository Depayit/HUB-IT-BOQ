import type { design_approval_status, lock_status } from "@prisma/client";

export type GovernanceCheck = {
  passes: boolean;
  message?: string;
};

/**
 * SLD requirement policy.
 * Data center BOQ governance requires a Single Line Diagram for all project types.
 * Kept as a function so future project types can relax this without touching the engine.
 */
export function projectRequiresSld(
  _projectType: string | null | undefined,
): boolean {
  return true;
}

/** Design Basis must be Approved before BOQ approval. */
export function evaluateDesignBasisApproval(
  approvalStatus: design_approval_status | string | null | undefined,
): GovernanceCheck {
  if (approvalStatus === "Approved") {
    return { passes: true };
  }
  if (approvalStatus == null) {
    return {
      passes: false,
      message: "ยังไม่มี Design Basis — สร้างและอนุมัติก่อนอนุมัติ BOQ",
    };
  }
  return {
    passes: false,
    message: `Design Basis สถานะ ${approvalStatus} — ต้อง Approved ก่อนอนุมัติ BOQ`,
  };
}

/** BOQ must be Locked before handoff. */
export function evaluateHandoffLock(
  lockStatus: lock_status | string | null | undefined,
): GovernanceCheck {
  if (lockStatus === "Locked") {
    return { passes: true };
  }
  return {
    passes: false,
    message: "BOQ ต้อง Locked ก่อน handoff",
  };
}
