"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { boqSummaryService } from "@/lib/services/boq-summary.service";
import { boqSummaryReportService } from "@/lib/services/boq-summary-report.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { toUserMessage } from "@/lib/utils/errors";

const marginSchema = z.object({
  margin_percent: z
    .number()
    .min(0, "Margin ต้องไม่ต่ำกว่า 0")
    .max(100, "Margin ต้องไม่เกิน 100"),
});

function revalidateBoqPaths(projectId: string, boqVersionId: string) {
  const base = `/projects/${projectId}/boq/${boqVersionId}`;
  revalidatePath(base);
  revalidatePath(`${base}/summary`);
  revalidatePath(`/projects/${projectId}`);
}

export async function loadBoqSummary(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    let { summary, breakdownCount } =
      await boqSummaryService.getSummaryForVersion(boqVersionId);

    let unmappedCodes: string[] = [];
    if (!summary) {
      const refreshed = await boqSummaryService.refreshSummary(boqVersionId);
      summary = refreshed.summary;
      unmappedCodes = refreshed.unmappedCodes;
      breakdownCount = refreshed.summary.breakdown_line_count;
    }

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
        currency: version.project.currency,
      },
      summary,
      breakdownCount,
      unmappedCodes,
      is_editable: version.lock_status !== "Locked",
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function loadBoqSummaryReport(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const report = await boqSummaryReportService.getBoqSummaryReport(
      projectId,
      boqVersionId,
    );
    if (!report) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    return {
      ok: true as const,
      report,
      is_editable: version.lock_status !== "Locked",
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function refreshBoqSummary(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const { summary, unmappedCodes } =
      await boqSummaryService.refreshSummary(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);

    return { ok: true as const, summary, unmappedCodes };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function updateBoqSummaryMargin(
  projectId: string,
  boqVersionId: string,
  input: { margin_percent: number },
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const parsed = marginSchema.parse(input);
    const { summary, unmappedCodes } = await boqSummaryService.updateMargin(
      boqVersionId,
      parsed.margin_percent,
    );
    revalidateBoqPaths(projectId, boqVersionId);

    return { ok: true as const, summary, unmappedCodes };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}
