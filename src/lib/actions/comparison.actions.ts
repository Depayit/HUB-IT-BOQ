"use server";

import { revalidatePath } from "next/cache";
import { revisionComparisonService } from "@/lib/services/revision-comparison.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { toUserMessage } from "@/lib/utils/errors";

function revalidateComparisonPath(projectId: string, boqVersionId: string) {
  revalidatePath(`/projects/${projectId}/boq/${boqVersionId}/comparison`);
}

export async function loadRevisionComparison(
  projectId: string,
  boqVersionId: string,
  baselineBoqVersionId?: string,
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const versions = await revisionComparisonService.listProjectVersions(projectId);
    const current = versions.find((v) => v.boq_version_id === boqVersionId);
    if (!current) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const defaultBaseline =
      revisionComparisonService.resolveDefaultBaseline(current, versions);

    const baselineId =
      baselineBoqVersionId ?? defaultBaseline?.boq_version_id ?? null;

    if (!baselineId) {
      return {
        ok: true as const,
        version: {
          boq_version_id: version.boq_version_id,
          version_no: version.version_no,
          status: version.status,
          lock_status: version.lock_status,
          project_name: version.project.project_name,
        },
        versions,
        comparison: null,
        baseline_boq_version_id: null,
        message: "ไม่มี revision ก่อนหน้า — สร้าง revision ใหม่เพื่อเปรียบเทียบ",
      };
    }

    const comparison = await revisionComparisonService.compare(
      projectId,
      boqVersionId,
      baselineId,
    );

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
      },
      versions,
      comparison,
      baseline_boq_version_id: baselineId,
      message: null,
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function compareRevisions(
  projectId: string,
  boqVersionId: string,
  baselineBoqVersionId: string,
) {
  try {
    const comparison = await revisionComparisonService.compare(
      projectId,
      boqVersionId,
      baselineBoqVersionId,
    );
    revalidateComparisonPath(projectId, boqVersionId);
    return { ok: true as const, comparison };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}
