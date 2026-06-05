"use server";

import { revalidatePath } from "next/cache";
import { reportingValidationService } from "@/lib/services/reporting-validation.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { toUserMessage } from "@/lib/utils/errors";

function revalidateSummaryPath(projectId: string, boqVersionId: string) {
  revalidatePath(`/projects/${projectId}/boq/${boqVersionId}/summary`);
}

export async function loadReportValidation(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const { report, validation } =
      await reportingValidationService.validateBoqVersion(projectId, boqVersionId);

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
      },
      validation,
      report_sections: {
        has_project: report.project != null,
        has_document: (report.document?.links.length ?? 0) > 0,
        has_discipline: (report.discipline?.included_count ?? 0) > 0,
        has_cost: report.cost != null && report.cost.subtotal_before_margin > 0,
        has_validation: report.validation?.validation_run ?? false,
      },
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function runReportValidation(projectId: string, boqVersionId: string) {
  try {
    const result = await loadReportValidation(projectId, boqVersionId);
    if (!result.ok) return result;
    revalidateSummaryPath(projectId, boqVersionId);
    return result;
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}
