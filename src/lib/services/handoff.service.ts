import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { validationService } from "@/lib/services/validation.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { auditService } from "@/lib/services/audit.service";

export const handoffService = {
  async getPageData(projectId: string, boqVersionId: string) {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) return null;

    const [validationGate, handoffs] = await Promise.all([
      validationService.getWorkflowGate(boqVersionId),
      prisma.handoff_records.findMany({
        where: { boq_version_id: boqVersionId },
        orderBy: { created_at: "desc" },
      }),
    ]);

    const is_approved_locked =
      version.status === "Approved" || version.status === "Locked";
    const is_locked = version.lock_status === "Locked";

    const can_handoff =
      is_approved_locked &&
      is_locked &&
      validationGate.can_handoff;

    const block_messages: string[] = [];
    if (!is_approved_locked || !is_locked) {
      block_messages.push("Handoff ต้องการ BOQ สถานะ Approved และ Lock: Locked");
    }
    if (!validationGate.can_handoff && validationGate.block_reason) {
      block_messages.push(validationGate.block_reason);
    }

    return {
      version,
      validationGate,
      handoffs,
      can_handoff,
      block_messages,
    };
  },

  async assertCanHandoff(boqVersionId: string) {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version) {
      throw new AppError("ไม่พบ BOQ Version", "BOQ_VERSION_NOT_FOUND", 404);
    }
    if (version.lock_status !== "Locked") {
      throw new AppError(
        "Handoff ต้องการ BOQ ที่ Locked แล้ว",
        "BOQ_NOT_LOCKED",
        403,
      );
    }
    await validationService.assertNoUnresolvedBlocks(boqVersionId);
  },

  async createHandoff(
    boqVersionId: string,
    handedOffBy: string,
    notes?: string,
  ) {
    await this.assertCanHandoff(boqVersionId);

    const record = await prisma.handoff_records.create({
      data: {
        boq_version_id: boqVersionId,
        handoff_status: "Completed",
        handed_off_by: handedOffBy,
        handoff_at: new Date(),
        notes: notes?.trim() || null,
      },
    });

    await auditService.append({
      object_type: "boq_version",
      object_id: boqVersionId,
      action_type: "handoff",
      new_value: "Completed",
      changed_by: handedOffBy,
      change_reason: notes?.trim() || null,
    });

    return record;
  },
};
