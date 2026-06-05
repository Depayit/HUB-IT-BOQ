import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

export async function isLatestDesignBasisApproved(projectId: string): Promise<boolean> {
  const latest = await prisma.design_basis_versions.findFirst({
    where: { project_id: projectId },
    orderBy: { design_version_no: "desc" },
    select: { approval_status: true },
  });
  return latest?.approval_status === "Approved";
}

export async function assertDesignBasisApprovedForBoqApproval(
  projectId: string,
): Promise<void> {
  const ok = await isLatestDesignBasisApproved(projectId);
  if (!ok) {
    throw new AppError(
      "ไม่สามารถอนุมัติ BOQ ได้ — Design Basis ล่าสุดต้องมีสถานะ Approved ก่อน",
      "DESIGN_BASIS_NOT_APPROVED",
      403,
    );
  }
}

export async function getDesignBasisApprovalGate(projectId: string) {
  const latest = await prisma.design_basis_versions.findFirst({
    where: { project_id: projectId },
    orderBy: { design_version_no: "desc" },
    select: {
      design_basis_version_id: true,
      design_version_no: true,
      approval_status: true,
    },
  });

  if (!latest) {
    return {
      can_approve_boq: false,
      message: "ยังไม่มี Design Basis — สร้างและอนุมัติก่อนอนุมัติ BOQ",
      latest: null,
    };
  }

  const can_approve_boq = latest.approval_status === "Approved";
  return {
    can_approve_boq,
    message: can_approve_boq
      ? "Design Basis อนุมัติแล้ว — สามารถดำเนินการอนุมัติ BOQ ได้"
      : `Design Basis v${latest.design_version_no} สถานะ ${latest.approval_status} — ต้อง Approved ก่อนอนุมัติ BOQ`,
    latest,
  };
}
