"use server";

import { revalidatePath } from "next/cache";
import { boqLineService } from "@/lib/services/boq-line.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { toUserMessage } from "@/lib/utils/errors";
import { boqLineSchema } from "@/lib/validations/boq-line";

function revalidateBoqPaths(projectId: string, boqVersionId: string) {
  revalidatePath(`/projects/${projectId}/boq/${boqVersionId}`);
  revalidatePath(`/projects/${projectId}/boq/${boqVersionId}/lines`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function getBoqLinesPageData(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const [lines, disciplines] = await Promise.all([
      boqLineService.listByBoqVersion(boqVersionId),
      boqLineService.listDisciplineOptions(boqVersionId),
    ]);

    const critical_failures = lines.filter((l) => l.is_critical_line && !l.validation.passes);

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
      },
      lines,
      disciplines,
      critical_failure_count: critical_failures.length,
      is_editable: version.lock_status !== "Locked",
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function createBoqLine(boqVersionId: string, projectId: string, input: unknown) {
  try {
    const data = boqLineSchema.parse(input);
    const line = await boqLineService.create(boqVersionId, data);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const, line };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function updateBoqLine(
  boqLineId: string,
  boqVersionId: string,
  projectId: string,
  input: unknown,
) {
  try {
    const data = boqLineSchema.parse(input);
    const line = await boqLineService.update(boqLineId, boqVersionId, data);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const, line };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function deleteBoqLine(
  boqLineId: string,
  boqVersionId: string,
  projectId: string,
) {
  try {
    await boqLineService.delete(boqLineId, boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}
