import {
  Prisma,
  validation_severity,
  type approval_workflows,
  type boq_versions,
  type projects,
  type validation_results,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { calcRackDensityKwPerRack, decimalToNumber } from "@/lib/utils/rack-density";
import type { ProjectSetupInput } from "@/lib/validations/project";

export type DashboardVariant = "default" | "warning" | "block" | "success";

export type ProjectDashboardStatus = {
  label: string;
  variant: DashboardVariant;
  boq_version_id?: string;
  boq_status?: string;
  lock_status?: string;
  unresolved_blocks: number;
  approval_stage?: string;
  workflow_status?: string;
};

type BoqVersionWithRelations = boq_versions & {
  validation_results: validation_results[];
  approval_workflows: approval_workflows | null;
};

export type ProjectListItem = projects & {
  rack_density_kw_per_rack: Prisma.Decimal | null;
  dashboard: ProjectDashboardStatus;
  latest_boq_version_no: number | null;
};

export type ProjectDetail = projects & {
  rack_density_kw_per_rack: Prisma.Decimal | null;
  dashboard: ProjectDashboardStatus;
  boq_versions: BoqVersionWithRelations[];
};

const latestBoqInclude = {
  orderBy: { version_no: "desc" as const },
  take: 1,
  include: {
    validation_results: {
      where: { resolved_flag: false, severity: validation_severity.BLOCK },
    },
    approval_workflows: true,
  },
};

export function deriveDashboardStatus(
  boqVersions: BoqVersionWithRelations[],
): ProjectDashboardStatus {
  const latest = boqVersions[0];
  if (!latest) {
    return { label: "ไม่มี BOQ", variant: "default", unresolved_blocks: 0 };
  }

  const unresolved_blocks = latest.validation_results.length;
  const base = {
    boq_version_id: latest.boq_version_id,
    boq_status: latest.status,
    lock_status: latest.lock_status,
    unresolved_blocks,
    approval_stage: latest.approval_workflows?.current_stage,
    workflow_status: latest.approval_workflows?.workflow_status,
  };

  if (unresolved_blocks > 0) {
    return {
      ...base,
      label: `Validation Blocked (${unresolved_blocks})`,
      variant: "block",
    };
  }

  if (latest.lock_status === "Locked") {
    return { ...base, label: "BOQ Locked", variant: "success" };
  }

  const approval = latest.approval_workflows;
  if (approval?.workflow_status === "Rejected") {
    return { ...base, label: "Approval Rejected", variant: "block" };
  }
  if (approval?.workflow_status === "InProgress") {
    return {
      ...base,
      label: `รออนุมัติ: ${approval.current_stage}`,
      variant: "warning",
    };
  }
  if (approval?.workflow_status === "Completed") {
    return { ...base, label: "BOQ Approved", variant: "success" };
  }

  switch (latest.status) {
    case "InReview":
      return { ...base, label: "BOQ In Review", variant: "warning" };
    case "Approved":
      return { ...base, label: "BOQ Approved", variant: "success" };
    case "Locked":
      return { ...base, label: "BOQ Locked", variant: "success" };
    case "Superseded":
      return { ...base, label: "BOQ Superseded", variant: "default" };
    default:
      return { ...base, label: "BOQ Draft", variant: "default" };
  }
}

function toProjectData(input: ProjectSetupInput) {
  const rack_density_kw_per_rack = calcRackDensityKwPerRack(
    input.it_load_kw,
    input.rack_count,
  );
  if (!rack_density_kw_per_rack) {
    throw new AppError("ไม่สามารถคำนวณ Rack Density ได้", "INVALID_RACK_DENSITY");
  }

  return {
    client_id: input.client_id ?? null,
    opportunity_id: input.opportunity_id ?? null,
    project_name: input.project_name,
    location: input.location ?? null,
    project_type: input.project_type ?? null,
    it_load_kw: new Prisma.Decimal(input.it_load_kw),
    rack_count: input.rack_count,
    rack_density_kw_per_rack,
    tier_target: input.tier_target ?? null,
    sla_target: input.sla_target ?? null,
    currency: input.currency ?? "THB",
    vat_option: input.vat_option ?? null,
    project_status: input.project_status,
  };
}

export const projectService = {
  async listWithDashboard(): Promise<ProjectListItem[]> {
    const rows = await prisma.projects.findMany({
      orderBy: { updated_at: "desc" },
      include: { boq_versions: latestBoqInclude },
    });

    return rows.map((row) => ({
      ...row,
      dashboard: deriveDashboardStatus(row.boq_versions),
      latest_boq_version_no: row.boq_versions[0]?.version_no ?? null,
    }));
  },

  async getById(projectId: string): Promise<ProjectDetail | null> {
    const row = await prisma.projects.findUnique({
      where: { project_id: projectId },
      include: {
        boq_versions: {
          orderBy: { version_no: "desc" },
          include: {
            validation_results: {
              where: { resolved_flag: false, severity: validation_severity.BLOCK },
            },
            approval_workflows: true,
          },
        },
      },
    });
    if (!row) return null;

    const [latest, ...rest] = row.boq_versions;
    const ordered = latest ? [latest, ...rest] : [];

    return {
      ...row,
      boq_versions: ordered,
      dashboard: deriveDashboardStatus(ordered),
    };
  },

  async create(input: ProjectSetupInput) {
    return prisma.projects.create({ data: toProjectData(input) });
  },

  async update(projectId: string, input: ProjectSetupInput) {
    const existing = await prisma.projects.findUnique({
      where: { project_id: projectId },
    });
    if (!existing) {
      throw new AppError("ไม่พบโปรเจกต์", "PROJECT_NOT_FOUND", 404);
    }
    return prisma.projects.update({
      where: { project_id: projectId },
      data: toProjectData(input),
    });
  },

  formatForClient(project: projects) {
    return {
      ...project,
      it_load_kw: decimalToNumber(project.it_load_kw),
      rack_density_kw_per_rack: decimalToNumber(project.rack_density_kw_per_rack),
    };
  },
};
