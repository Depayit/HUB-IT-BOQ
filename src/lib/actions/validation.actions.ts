"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validationService } from "@/lib/services/validation.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { toUserMessage } from "@/lib/utils/errors";

const overrideSchema = z.object({
  override_reason: z.string().min(1, "กรุณาระบุ override reason"),
  resolved_by: z.string().min(1).max(128).default("user"),
});

function revalidateBoqPaths(projectId: string, boqVersionId: string) {
  const base = `/projects/${projectId}/boq/${boqVersionId}`;
  revalidatePath(base);
  revalidatePath(`${base}/validation`);
  revalidatePath(`${base}/approval`);
  revalidatePath(`${base}/handoff`);
  revalidatePath(`/projects/${projectId}`);
}

export async function loadValidationPanel(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const [results, gate] = await Promise.all([
      validationService.listResultsWithRules(boqVersionId),
      validationService.getWorkflowGate(boqVersionId),
    ]);

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
      },
      results,
      gate,
      is_editable: version.lock_status !== "Locked",
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function runBoqValidation(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const results = await validationService.runValidation(boqVersionId);
    const gate = await validationService.getWorkflowGate(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);

    return { ok: true as const, results, gate };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function resolveValidationResult(
  projectId: string,
  boqVersionId: string,
  validationResultId: string,
  resolvedBy: string = "user",
) {
  try {
    await validationService.resolveResult(
      validationResultId,
      boqVersionId,
      resolvedBy,
    );
    const gate = await validationService.getWorkflowGate(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const, gate };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function overrideValidationResult(
  projectId: string,
  boqVersionId: string,
  validationResultId: string,
  input: { override_reason: string; resolved_by?: string },
) {
  try {
    const parsed = overrideSchema.parse(input);
    await validationService.overrideResult(
      validationResultId,
      boqVersionId,
      parsed.override_reason,
      parsed.resolved_by,
    );
    const gate = await validationService.getWorkflowGate(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const, gate };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}
