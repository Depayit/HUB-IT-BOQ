"use server";

import { revalidatePath } from "next/cache";
import { designBasisService } from "@/lib/services/design-basis.service";
import { getDesignBasisApprovalGate } from "@/lib/services/design-basis-guard";
import { toUserMessage } from "@/lib/utils/errors";
import {
  designBasisSchema,
  designBasisStatusActionSchema,
} from "@/lib/validations/design-basis";

function revalidateProjectPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/design-basis`);
  revalidatePath("/projects");
}

export async function getDesignBasisPageData(projectId: string) {
  try {
    const [versions, gate] = await Promise.all([
      designBasisService.listByProject(projectId),
      getDesignBasisApprovalGate(projectId),
    ]);
    return {
      ok: true as const,
      versions: versions.map((v) => designBasisService.formatForClient(v)),
      gate,
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function createDesignBasisVersion(projectId: string, input: unknown) {
  try {
    const data = designBasisSchema.parse(input);
    const row = await designBasisService.createVersion(projectId, data);
    revalidateProjectPaths(projectId);
    return {
      ok: true as const,
      version: designBasisService.formatForClient(row),
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function updateDesignBasisVersion(
  designBasisVersionId: string,
  projectId: string,
  input: unknown,
) {
  try {
    const data = designBasisSchema.parse(input);
    const row = await designBasisService.update(designBasisVersionId, data);
    revalidateProjectPaths(projectId);
    return {
      ok: true as const,
      version: designBasisService.formatForClient(row),
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function transitionDesignBasisStatus(projectId: string, input: unknown) {
  try {
    const { design_basis_version_id, action } = designBasisStatusActionSchema.parse(input);
    const row = await designBasisService.transitionStatus(design_basis_version_id, action);
    revalidateProjectPaths(projectId);
    return {
      ok: true as const,
      version: designBasisService.formatForClient(row),
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}
