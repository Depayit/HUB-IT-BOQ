"use server";

import { revalidatePath } from "next/cache";
import {
  documentService,
  STAGE_DOCUMENT_REQUIREMENTS,
  type BoqDocumentLinkRow,
  type DocumentRow,
} from "@/lib/services/document.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { toUserMessage } from "@/lib/utils/errors";
import {
  DOCUMENT_TYPES,
  WORKFLOW_STAGES,
  documentSchema,
  linkDocumentSchema,
  updateDependencyStatusSchema,
} from "@/lib/validations/document";

function revalidateBoqPaths(projectId: string, boqVersionId: string) {
  const base = `/projects/${projectId}/boq/${boqVersionId}`;
  revalidatePath(base);
  revalidatePath(`${base}/documents`);
  revalidatePath(`${base}/validation`);
  revalidatePath(`${base}/approval`);
  revalidatePath(`${base}/handoff`);
  revalidatePath(`/projects/${projectId}`);
}

export async function loadDocumentsPage(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const [documents, links, missingRequired] = await Promise.all([
      documentService.listProjectDocuments(projectId),
      documentService.listBoqDocumentLinks(boqVersionId),
      documentService.findMissingRequiredDocs(projectId, boqVersionId),
    ]);

    const dependencySummary = documentService.getDependencySummary(links);

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
      },
      documents,
      links,
      dependencySummary,
      stageRequirements: STAGE_DOCUMENT_REQUIREMENTS,
      documentTypes: DOCUMENT_TYPES,
      workflowStages: WORKFLOW_STAGES,
      missingRequired,
      is_editable: version.lock_status !== "Locked",
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function createDocumentAction(projectId: string, boqVersionId: string, input: unknown) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const data = documentSchema.parse(input);
    const document = await documentService.createDocument(projectId, data);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const, document };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function updateDocumentAction(
  documentId: string,
  projectId: string,
  boqVersionId: string,
  input: unknown,
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const data = documentSchema.parse(input);
    const document = await documentService.updateDocument(documentId, projectId, data);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const, document };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function deleteDocumentAction(
  documentId: string,
  projectId: string,
  boqVersionId: string,
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    await documentService.deleteDocument(documentId, projectId);
    revalidateBoqPaths(projectId, boqVersionId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function linkDocumentAction(
  projectId: string,
  boqVersionId: string,
  input: unknown,
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const data = linkDocumentSchema.parse(input);
    await documentService.linkDocument(boqVersionId, projectId, data);
    const links = await documentService.listBoqDocumentLinks(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);
    return {
      ok: true as const,
      links,
      dependencySummary: documentService.getDependencySummary(links),
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function unlinkDocumentAction(
  projectId: string,
  boqVersionId: string,
  boqVersionDocumentId: string,
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    await documentService.unlinkDocument(boqVersionDocumentId, boqVersionId);
    const links = await documentService.listBoqDocumentLinks(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);
    return {
      ok: true as const,
      links,
      dependencySummary: documentService.getDependencySummary(links),
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function updateDependencyStatusAction(
  projectId: string,
  boqVersionId: string,
  boqVersionDocumentId: string,
  input: unknown,
) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const { dependency_status } = updateDependencyStatusSchema.parse(input);
    await documentService.updateDependencyStatus(
      boqVersionDocumentId,
      boqVersionId,
      dependency_status,
    );
    const links = await documentService.listBoqDocumentLinks(boqVersionId);
    revalidateBoqPaths(projectId, boqVersionId);
    return {
      ok: true as const,
      links,
      dependencySummary: documentService.getDependencySummary(links),
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export type DocumentsPageDocumentRow = DocumentRow;
export type DocumentsPageLinkRow = BoqDocumentLinkRow;
