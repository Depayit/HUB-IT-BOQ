import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import {
  assertDesignBasisApprovedForBoqApproval,
  getDesignBasisApprovalGate,
} from "@/lib/services/design-basis-guard";
import { validationService } from "@/lib/services/validation.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { auditService } from "@/lib/services/audit.service";
import {
  assertRoleForStage,
  getNextStage,
  getRequiredRoleForStage,
  isValidTransition,
  isWorkflowStage,
  WORKFLOW_STAGES,
  type ApprovalRole,
  type WorkflowStage,
} from "@/lib/workflow-authority";

export const approvalService = {
  async getPageData(projectId: string, boqVersionId: string) {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) return null;

    const [workflow, validationGate, designGate] = await Promise.all([
      prisma.approval_workflows.findUnique({
        where: { boq_version_id: boqVersionId },
      }),
      validationService.getWorkflowGate(boqVersionId),
      getDesignBasisApprovalGate(projectId),
    ]);

    const currentStage = workflow?.current_stage ?? null;
    const workflowStage: WorkflowStage | null =
      currentStage && isWorkflowStage(currentStage) ? currentStage : null;

    const can_approve =
      validationGate.can_approve && designGate.can_approve_boq;

    const block_messages: string[] = [];
    if (!validationGate.can_approve && validationGate.block_reason) {
      block_messages.push(validationGate.block_reason);
    }
    if (!designGate.can_approve_boq) {
      block_messages.push(designGate.message);
    }

    return {
      version,
      workflow,
      validationGate,
      designGate,
      can_approve,
      block_messages,
      stages: WORKFLOW_STAGES,
      required_role: getRequiredRoleForStage(workflowStage),
    };
  },

  async assertCanProceedApproval(projectId: string, boqVersionId: string) {
    await assertDesignBasisApprovedForBoqApproval(projectId);
    await validationService.assertNoUnresolvedBlocks(boqVersionId);
  },

  async advanceStage(
    projectId: string,
    boqVersionId: string,
    actor: string,
    actorRole: ApprovalRole,
  ) {
    await this.assertCanProceedApproval(projectId, boqVersionId);

    const version = await boqVersionService.getById(boqVersionId);
    if (!version) {
      throw new AppError("ไม่พบ BOQ Version", "BOQ_VERSION_NOT_FOUND", 404);
    }
    if (version.lock_status === "Locked") {
      throw new AppError("BOQ ถูกล็อกแล้ว", "BOQ_LOCKED", 403);
    }

    const existing = await prisma.approval_workflows.findUnique({
      where: { boq_version_id: boqVersionId },
    });

    const currentStageRaw = existing?.current_stage ?? null;
    const currentStage: WorkflowStage | null =
      currentStageRaw && isWorkflowStage(currentStageRaw) ? currentStageRaw : null;

    if (currentStageRaw && !currentStage) {
      throw new AppError("Workflow stage ไม่รู้จัก", "INVALID_WORKFLOW_STAGE", 400);
    }

    assertRoleForStage(currentStage, actorRole);

    const nextStage = getNextStage(currentStage);
    if (!nextStage) {
      throw new AppError("Approval workflow เสร็จสมบูรณ์แล้ว", "WORKFLOW_COMPLETE", 400);
    }

    if (currentStage && !isValidTransition(currentStage, nextStage)) {
      throw new AppError("Transition ไม่ถูกต้อง", "INVALID_TRANSITION", 400);
    }

    const now = new Date();

    if (!existing) {
      const created = await prisma.approval_workflows.create({
        data: {
          boq_version_id: boqVersionId,
          current_stage: nextStage,
          workflow_status: "InProgress",
          engineer_reviewed_by: actor,
          engineer_reviewed_at: now,
        },
      });
      await auditService.append({
        object_type: "boq_version",
        object_id: boqVersionId,
        action_type: "approve",
        new_value: nextStage,
        changed_by: actor,
        change_reason: `Advance to ${nextStage} by ${actorRole}`,
      });
      return created;
    }

    const updates: Record<string, unknown> = {
      current_stage: nextStage,
      workflow_status: nextStage === "Final Lock" ? "Completed" : "InProgress",
    };

    if (nextStage === "Manager Approval") {
      updates.engineer_reviewed_by = actor;
      updates.engineer_reviewed_at = now;
    } else if (nextStage === "Director Approval") {
      updates.manager_approved_by = actor;
      updates.manager_approved_at = now;
    } else if (nextStage === "Final Lock") {
      updates.director_approved_by = actor;
      updates.director_approved_at = now;
      updates.final_locked_by = actor;
      updates.final_locked_at = now;
      await prisma.boq_versions.update({
        where: { boq_version_id: boqVersionId },
        data: { status: "Locked", lock_status: "Locked" },
      });
    }

    const updated = await prisma.approval_workflows.update({
      where: { boq_version_id: boqVersionId },
      data: updates,
    });

    await auditService.append({
      object_type: "boq_version",
      object_id: boqVersionId,
      action_type: nextStage === "Final Lock" ? "lock" : "approve",
      old_value: currentStage,
      new_value: nextStage,
      changed_by: actor,
      change_reason: `Advance to ${nextStage} by ${actorRole}`,
    });

    return updated;
  },
};
