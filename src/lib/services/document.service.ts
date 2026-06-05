import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { boqVersionService } from "@/lib/services/boq-version.service";
import {
  DOCUMENT_TYPES,
  REQUIRED_DOC_RULES,
  type DocumentInput,
  type LinkDocumentInput,
} from "@/lib/validations/document";

export type DocumentRow = {
  document_id: string;
  document_type: string;
  document_name: string;
  file_link: string | null;
  version_no: string;
  document_status: string;
  related_workflow_stage: string | null;
  created_at: string;
  updated_at: string;
};

export type BoqDocumentLinkRow = {
  boq_version_document_id: string;
  document_id: string;
  dependency_type: string;
  is_required: boolean;
  dependency_status: string;
  document: DocumentRow;
};

/** Which document types are expected before each workflow stage */
export const STAGE_DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
  "Engineer Review": ["TOR", "SLD"],
  "Manager Approval": ["Specification"],
  Handoff: ["Specification", "Handover"],
};

function formatDocument(row: {
  document_id: string;
  document_type: string;
  document_name: string;
  file_link: string | null;
  version_no: string;
  document_status: string;
  related_workflow_stage: string | null;
  created_at: Date;
  updated_at: Date;
}): DocumentRow {
  return {
    document_id: row.document_id,
    document_type: row.document_type,
    document_name: row.document_name,
    file_link: row.file_link,
    version_no: row.version_no,
    document_status: row.document_status,
    related_workflow_stage: row.related_workflow_stage,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function initialDependencyStatus(documentStatus: string): "Pending" | "Satisfied" {
  return documentStatus === "Active" ? "Satisfied" : "Pending";
}

export const documentService = {
  getDocumentTypes() {
    return DOCUMENT_TYPES;
  },

  getStageRequirements() {
    return STAGE_DOCUMENT_REQUIREMENTS;
  },

  async listProjectDocuments(projectId: string): Promise<DocumentRow[]> {
    const rows = await prisma.documents.findMany({
      where: { project_id: projectId },
      orderBy: [{ document_type: "asc" }, { document_name: "asc" }],
    });
    return rows.map(formatDocument);
  },

  async getDocument(documentId: string, projectId: string) {
    const row = await prisma.documents.findFirst({
      where: { document_id: documentId, project_id: projectId },
    });
    if (!row) {
      throw new AppError("ไม่พบเอกสาร", "DOCUMENT_NOT_FOUND", 404);
    }
    return formatDocument(row);
  },

  async createDocument(projectId: string, input: DocumentInput) {
    const row = await prisma.documents.create({
      data: {
        project_id: projectId,
        document_type: input.document_type,
        document_name: input.document_name,
        file_link: input.file_link,
        version_no: input.version_no,
        document_status: input.document_status,
        related_workflow_stage: input.related_workflow_stage,
      },
    });
    return formatDocument(row);
  },

  async updateDocument(documentId: string, projectId: string, input: DocumentInput) {
    await this.getDocument(documentId, projectId);

    const row = await prisma.documents.update({
      where: { document_id: documentId },
      data: {
        document_type: input.document_type,
        document_name: input.document_name,
        file_link: input.file_link,
        version_no: input.version_no,
        document_status: input.document_status,
        related_workflow_stage: input.related_workflow_stage,
      },
    });

    // Sync linked BOQ dependencies when document becomes Active
    if (input.document_status === "Active") {
      await prisma.boq_version_documents.updateMany({
        where: {
          document_id: documentId,
          dependency_status: "Pending",
        },
        data: { dependency_status: "Satisfied" },
      });
    }

    return formatDocument(row);
  },

  async deleteDocument(documentId: string, projectId: string) {
    await this.getDocument(documentId, projectId);

    const linkCount = await prisma.boq_version_documents.count({
      where: { document_id: documentId },
    });
    if (linkCount > 0) {
      throw new AppError(
        "ไม่สามารถลบเอกสารที่ถูกลิงก์กับ BOQ version แล้ว — ยกเลิกลิงก์ก่อน",
        "DOCUMENT_LINKED",
        400,
      );
    }

    await prisma.documents.delete({ where: { document_id: documentId } });
  },

  async activateDocument(documentId: string, projectId: string) {
    return this.updateDocument(documentId, projectId, {
      ...(await this.getDocument(documentId, projectId)),
      document_type: (await this.getDocument(documentId, projectId))
        .document_type as DocumentInput["document_type"],
      document_status: "Active",
    });
  },

  async listBoqDocumentLinks(boqVersionId: string): Promise<BoqDocumentLinkRow[]> {
    const rows = await prisma.boq_version_documents.findMany({
      where: { boq_version_id: boqVersionId },
      include: { document: true },
      orderBy: [{ is_required: "desc" }, { dependency_type: "asc" }],
    });

    return rows.map((r) => ({
      boq_version_document_id: r.boq_version_document_id,
      document_id: r.document_id,
      dependency_type: r.dependency_type,
      is_required: r.is_required,
      dependency_status: r.dependency_status,
      document: formatDocument(r.document),
    }));
  },

  async linkDocument(boqVersionId: string, projectId: string, input: LinkDocumentInput) {
    await boqVersionService.assertEditable(boqVersionId);

    const doc = await prisma.documents.findFirst({
      where: { document_id: input.document_id, project_id: projectId },
    });
    if (!doc) {
      throw new AppError("ไม่พบเอกสารในโปรเจกต์นี้", "DOCUMENT_NOT_FOUND", 404);
    }

    const dependency_status = initialDependencyStatus(doc.document_status);

    return prisma.boq_version_documents.upsert({
      where: {
        boq_version_id_document_id: {
          boq_version_id: boqVersionId,
          document_id: input.document_id,
        },
      },
      create: {
        boq_version_id: boqVersionId,
        document_id: input.document_id,
        dependency_type: input.dependency_type,
        is_required: input.is_required,
        dependency_status,
      },
      update: {
        dependency_type: input.dependency_type,
        is_required: input.is_required,
      },
      include: { document: true },
    });
  },

  async unlinkDocument(boqVersionDocumentId: string, boqVersionId: string) {
    await boqVersionService.assertEditable(boqVersionId);

    const link = await prisma.boq_version_documents.findFirst({
      where: {
        boq_version_document_id: boqVersionDocumentId,
        boq_version_id: boqVersionId,
      },
    });
    if (!link) {
      throw new AppError("ไม่พบ document link", "DOC_LINK_NOT_FOUND", 404);
    }

    await prisma.boq_version_documents.delete({
      where: { boq_version_document_id: boqVersionDocumentId },
    });
  },

  async updateDependencyStatus(
    boqVersionDocumentId: string,
    boqVersionId: string,
    dependencyStatus: "Pending" | "Satisfied" | "Waived" | "NotApplicable",
  ) {
    await boqVersionService.assertEditable(boqVersionId);

    const link = await prisma.boq_version_documents.findFirst({
      where: {
        boq_version_document_id: boqVersionDocumentId,
        boq_version_id: boqVersionId,
      },
      include: { document: true },
    });
    if (!link) {
      throw new AppError("ไม่พบ document link", "DOC_LINK_NOT_FOUND", 404);
    }

    if (dependencyStatus === "Satisfied" && link.document.document_status !== "Active") {
      throw new AppError(
        "ต้องตั้งสถานะเอกสารเป็น Active ก่อน mark dependency เป็น Satisfied",
        "DOCUMENT_NOT_ACTIVE",
        400,
      );
    }

    return prisma.boq_version_documents.update({
      where: { boq_version_document_id: boqVersionDocumentId },
      data: { dependency_status: dependencyStatus },
      include: { document: true },
    });
  },

  /** Used by validation engine — checks TOR, SLD, Specification requirements */
  async findMissingRequiredDocs(projectId: string, boqVersionId: string) {
    const [projectDocs, links] = await Promise.all([
      prisma.documents.findMany({ where: { project_id: projectId } }),
      this.listBoqDocumentLinks(boqVersionId),
    ]);

    const missing: { rule: string; document_type: string; message: string }[] = [];

    for (const rule of REQUIRED_DOC_RULES) {
      const hasActiveDoc = projectDocs.some(
        (d) => d.document_type === rule.docType && d.document_status === "Active",
      );
      const hasSatisfiedLink = links.some(
        (l) =>
          l.document.document_type === rule.docType &&
          l.is_required &&
          (l.dependency_status === "Satisfied" || l.dependency_status === "Waived"),
      );

      if (!hasActiveDoc && !hasSatisfiedLink) {
        missing.push({
          rule: rule.ruleCode,
          document_type: rule.docType,
          message: `Missing ${rule.label} — upload Active document or mark dependency Satisfied/Waived`,
        });
      }
    }

    return missing;
  },

  getDependencySummary(links: BoqDocumentLinkRow[]) {
    const required = links.filter((l) => l.is_required);
    const satisfied = required.filter(
      (l) => l.dependency_status === "Satisfied" || l.dependency_status === "Waived",
    );
    return {
      required_count: required.length,
      satisfied_count: satisfied.length,
      pending_count: required.filter((l) => l.dependency_status === "Pending").length,
      all_required_satisfied: required.length === 0 || satisfied.length === required.length,
    };
  },
};
