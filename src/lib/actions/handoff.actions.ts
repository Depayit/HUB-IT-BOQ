"use server";

import { revalidatePath } from "next/cache";
import { handoffService } from "@/lib/services/handoff.service";
import type { HandoffTarget } from "@/lib/validations/handoff";
import { toUserMessage } from "@/lib/utils/errors";

function revalidateBoqPaths(projectId: string, boqVersionId: string) {
  const base = `/projects/${projectId}/boq/${boqVersionId}`;
  revalidatePath(base);
  revalidatePath(`${base}/handoff`);
  revalidatePath(`${base}/validation`);
}

export async function loadHandoffPage(projectId: string, boqVersionId: string) {
  try {
    const data = await handoffService.getPageData(projectId, boqVersionId);
    if (!data) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }
    return { ok: true as const, ...data };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function executeHandoff(
  projectId: string,
  boqVersionId: string,
  handedOffBy: string = "user",
  notes?: string,
  handoffTarget?: HandoffTarget,
) {
  try {
    await handoffService.createHandoff(boqVersionId, handedOffBy, notes, handoffTarget);
    revalidateBoqPaths(projectId, boqVersionId);
    const data = await handoffService.getPageData(projectId, boqVersionId);
    if (!data) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }
    return { ok: true as const, ...data };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}
