import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

export const boqVersionService = {
  getById: async (boqVersionId: string) =>
    prisma.boq_versions.findUnique({
      where: { boq_version_id: boqVersionId },
      include: {
        project: { select: { project_id: true, project_name: true, currency: true } },
      },
    }),

  async assertEditable(boqVersionId: string) {
    const version = await this.getById(boqVersionId);
    if (!version) {
      throw new AppError("ไม่พบ BOQ Version", "BOQ_VERSION_NOT_FOUND", 404);
    }
    if (version.lock_status === "Locked") {
      throw new AppError("BOQ ถูกล็อก — ไม่สามารถแก้ไขได้", "BOQ_LOCKED", 403);
    }
    return version;
  },
};
