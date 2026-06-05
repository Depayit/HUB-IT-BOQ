import {
  Prisma,
  type design_basis_versions,
  type design_approval_status,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { calcRackDensityKwPerRack, decimalToNumber } from "@/lib/utils/rack-density";
import type { DesignBasisInput } from "@/lib/validations/design-basis";

function toDesignData(input: DesignBasisInput) {
  const rack_density_assumption = calcRackDensityKwPerRack(
    input.it_load_assumption_kw,
    input.rack_count_assumption,
  );
  if (!rack_density_assumption) {
    throw new AppError("ไม่สามารถคำนวณ Rack Density Assumption ได้", "INVALID_RACK_DENSITY");
  }

  return {
    it_load_assumption_kw: new Prisma.Decimal(input.it_load_assumption_kw),
    rack_count_assumption: input.rack_count_assumption,
    rack_density_assumption,
    power_architecture: input.power_architecture ?? null,
    cooling_architecture: input.cooling_architecture ?? null,
    fire_protection_assumption: input.fire_protection_assumption ?? null,
    monitoring_assumption: input.monitoring_assumption ?? null,
    redundancy_assumption: input.redundancy_assumption ?? null,
    technical_compliance_basis: input.technical_compliance_basis ?? null,
    customer_requirement_reference: input.customer_requirement_reference ?? null,
  };
}

function assertEditable(status: design_approval_status) {
  if (status === "Approved") {
    throw new AppError(
      "เวอร์ชันนี้อนุมัติแล้ว — สร้างเวอร์ชันใหม่เพื่อแก้ไข",
      "DESIGN_BASIS_LOCKED",
    );
  }
}

export const designBasisService = {
  async listByProject(projectId: string) {
    return prisma.design_basis_versions.findMany({
      where: { project_id: projectId },
      orderBy: { design_version_no: "desc" },
    });
  },

  async getById(designBasisVersionId: string) {
    return prisma.design_basis_versions.findUnique({
      where: { design_basis_version_id: designBasisVersionId },
    });
  },

  async getLatest(projectId: string) {
    return prisma.design_basis_versions.findFirst({
      where: { project_id: projectId },
      orderBy: { design_version_no: "desc" },
    });
  },

  async createVersion(projectId: string, input: DesignBasisInput) {
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId },
    });
    if (!project) {
      throw new AppError("ไม่พบโปรเจกต์", "PROJECT_NOT_FOUND", 404);
    }

    const latest = await this.getLatest(projectId);
    const design_version_no = (latest?.design_version_no ?? 0) + 1;

    return prisma.design_basis_versions.create({
      data: {
        project_id: projectId,
        design_version_no,
        approval_status: "Draft",
        ...toDesignData(input),
      },
    });
  },

  async update(designBasisVersionId: string, input: DesignBasisInput) {
    const row = await this.getById(designBasisVersionId);
    if (!row) {
      throw new AppError("ไม่พบ Design Basis", "DESIGN_BASIS_NOT_FOUND", 404);
    }
    assertEditable(row.approval_status);

    return prisma.design_basis_versions.update({
      where: { design_basis_version_id: designBasisVersionId },
      data: toDesignData(input),
    });
  },

  async transitionStatus(
    designBasisVersionId: string,
    action: "submit" | "approve" | "reject",
  ) {
    const row = await this.getById(designBasisVersionId);
    if (!row) {
      throw new AppError("ไม่พบ Design Basis", "DESIGN_BASIS_NOT_FOUND", 404);
    }

    let next: design_approval_status;
    switch (action) {
      case "submit":
        if (row.approval_status !== "Draft" && row.approval_status !== "Rejected") {
          throw new AppError("ส่งตรวจสอบได้เฉพาะสถานะ Draft หรือ Rejected", "INVALID_STATUS");
        }
        next = "InReview";
        break;
      case "approve":
        if (row.approval_status !== "InReview") {
          throw new AppError("อนุมัติได้เฉพาะสถานะ InReview", "INVALID_STATUS");
        }
        next = "Approved";
        break;
      case "reject":
        if (row.approval_status !== "InReview") {
          throw new AppError("ปฏิเสธได้เฉพาะสถานะ InReview", "INVALID_STATUS");
        }
        next = "Rejected";
        break;
    }

    return prisma.design_basis_versions.update({
      where: { design_basis_version_id: designBasisVersionId },
      data: { approval_status: next },
    });
  },

  formatForClient(row: design_basis_versions) {
    return {
      design_basis_version_id: row.design_basis_version_id,
      project_id: row.project_id,
      design_version_no: row.design_version_no,
      it_load_assumption_kw: decimalToNumber(row.it_load_assumption_kw),
      rack_count_assumption: row.rack_count_assumption,
      rack_density_assumption: decimalToNumber(row.rack_density_assumption),
      power_architecture: row.power_architecture,
      cooling_architecture: row.cooling_architecture,
      fire_protection_assumption: row.fire_protection_assumption,
      monitoring_assumption: row.monitoring_assumption,
      redundancy_assumption: row.redundancy_assumption,
      technical_compliance_basis: row.technical_compliance_basis,
      customer_requirement_reference: row.customer_requirement_reference,
      approval_status: row.approval_status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  },
};
