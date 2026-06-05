"use server";

import { revalidatePath } from "next/cache";
import { approvalService } from "@/lib/services/approval.service";
import { toUserMessage } from "@/lib/utils/errors";
import type { ApprovalRole } from "@/lib/workflow-authority";

function revalidateBoqPaths(projectId: string, boqVersionId: string) {
  const base = `/projects/${projectId}/boq/${boqVersionId}`;
  revalidatePath(base);
  revalidatePath(`${base}/approval`);
  revalidatePath(`${base}/validation`);
  revalidatePath(`/projects/${projectId}`);
}

export async function loadApprovalPage(projectId: string, boqVersionId: string) {
  try {
    const data = await approvalService.getPageData(projectId, boqVersionId);
    if (!data) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }
    return { ok: true as const, ...data };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function advanceApprovalStage(
  projectId: string,
  boqVersionId: string,
  actor: string = "user",
  actorRole: ApprovalRole = "Engineer",
) {
  try {
    await approvalService.advanceStage(projectId, boqVersionId, actor, actorRole);
    revalidateBoqPaths(projectId, boqVersionId);
    const data = await approvalService.getPageData(projectId, boqVersionId);
    if (!data) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }
    return { ok: true as const, ...data };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}
