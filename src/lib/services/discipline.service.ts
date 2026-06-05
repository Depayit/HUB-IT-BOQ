import type { risk_level } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { boqVersionService } from "@/lib/services/boq-version.service";
import {
  deriveDisciplineWorkflowStatus,
  type DisciplineWorkflowStatus,
} from "@/lib/validations/discipline-workflow";
import type {
  SaveProjectDisciplineInput,
  UpdateProjectDisciplineInput,
} from "@/lib/validations/discipline";

export type DisciplineMasterRow = {
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  description: string | null;
  is_active: boolean;
};

export type ProjectDisciplineRow = {
  project_discipline_id: string;
  project_id: string;
  boq_version_id: string;
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  description: string | null;
  included_flag: boolean;
  scope_description: string | null;
  exclusion_note: string | null;
  risk_level: risk_level;
  boq_line_count: number;
  workflow_status: DisciplineWorkflowStatus;
  created_at: string;
  updated_at: string;
};

type ProjectDisciplineWithJoin = {
  project_discipline_id: string;
  project_id: string;
  boq_version_id: string;
  discipline_id: string;
  included_flag: boolean;
  scope_description: string | null;
  exclusion_note: string | null;
  risk_level: risk_level;
  created_at: Date;
  updated_at: Date;
  discipline: {
    discipline_code: string;
    discipline_name: string;
    description: string | null;
  };
  _count?: { boq_lines: number };
};

function formatMaster(row: {
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  description: string | null;
  is_active: boolean;
}): DisciplineMasterRow {
  return {
    discipline_id: row.discipline_id,
    discipline_code: row.discipline_code,
    discipline_name: row.discipline_name,
    description: row.description,
    is_active: row.is_active,
  };
}

function formatProjectDiscipline(row: ProjectDisciplineWithJoin): ProjectDisciplineRow {
  const boq_line_count = row._count?.boq_lines ?? 0;
  return {
    project_discipline_id: row.project_discipline_id,
    project_id: row.project_id,
    boq_version_id: row.boq_version_id,
    discipline_id: row.discipline_id,
    discipline_code: row.discipline.discipline_code,
    discipline_name: row.discipline.discipline_name,
    description: row.discipline.description,
    included_flag: row.included_flag,
    scope_description: row.scope_description,
    exclusion_note: row.exclusion_note,
    risk_level: row.risk_level,
    boq_line_count,
    workflow_status: deriveDisciplineWorkflowStatus({
      included_flag: row.included_flag,
      boq_line_count,
      exclusion_note: row.exclusion_note,
    }),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const projectDisciplineInclude = {
  discipline: {
    select: { discipline_code: true, discipline_name: true, description: true },
  },
  _count: { select: { boq_lines: true } },
} as const;

async function ensureProjectDisciplineRows(projectId: string, boqVersionId: string) {
  const [masters, existing] = await Promise.all([
    prisma.discipline_master.findMany({
      where: { is_active: true },
      select: { discipline_id: true },
    }),
    prisma.project_disciplines.findMany({
      where: { boq_version_id: boqVersionId },
      select: { discipline_id: true },
    }),
  ]);

  const existingIds = new Set(existing.map((r) => r.discipline_id));
  const missing = masters.filter((m) => !existingIds.has(m.discipline_id));

  if (missing.length > 0) {
    await prisma.project_disciplines.createMany({
      data: missing.map((m) => ({
        project_id: projectId,
        boq_version_id: boqVersionId,
        discipline_id: m.discipline_id,
        included_flag: false,
        risk_level: "Medium" as risk_level,
      })),
      skipDuplicates: true,
    });
  }
}

export const disciplineService = {
  async listDisciplines(): Promise<DisciplineMasterRow[]> {
    const rows = await prisma.discipline_master.findMany({
      where: { is_active: true },
      orderBy: { discipline_code: "asc" },
    });
    return rows.map(formatMaster);
  },

  async getProjectDisciplines(
    projectId: string,
    boqVersionId: string,
  ): Promise<ProjectDisciplineRow[]> {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      throw new AppError("ไม่พบ BOQ Version", "BOQ_VERSION_NOT_FOUND", 404);
    }

    await ensureProjectDisciplineRows(projectId, boqVersionId);

    const rows = await prisma.project_disciplines.findMany({
      where: { boq_version_id: boqVersionId, project_id: projectId },
      include: projectDisciplineInclude,
      orderBy: { discipline: { discipline_code: "asc" } },
    });

    return rows.map(formatProjectDiscipline);
  },

  async saveProjectDiscipline(
    projectId: string,
    boqVersionId: string,
    input: SaveProjectDisciplineInput,
  ): Promise<ProjectDisciplineRow> {
    await boqVersionService.assertEditable(boqVersionId);

    if (input.project_id !== projectId || input.boq_version_id !== boqVersionId) {
      throw new AppError("ข้อมูล project/BOQ ไม่ตรงกัน", "DISCIPLINE_SCOPE_MISMATCH", 400);
    }

    const master = await prisma.discipline_master.findFirst({
      where: { discipline_id: input.discipline_id, is_active: true },
    });
    if (!master) {
      throw new AppError("ไม่พบ discipline", "DISCIPLINE_NOT_FOUND", 404);
    }

    const row = await prisma.project_disciplines.upsert({
      where: {
        boq_version_id_discipline_id: {
          boq_version_id: boqVersionId,
          discipline_id: input.discipline_id,
        },
      },
      create: {
        project_id: projectId,
        boq_version_id: boqVersionId,
        discipline_id: input.discipline_id,
        included_flag: input.included_flag,
        scope_description: input.scope_description,
        exclusion_note: input.exclusion_note,
        risk_level: input.risk_level,
      },
      update: {
        included_flag: input.included_flag,
        scope_description: input.scope_description,
        exclusion_note: input.exclusion_note,
        risk_level: input.risk_level,
      },
      include: projectDisciplineInclude,
    });

    return formatProjectDiscipline(row);
  },

  async updateProjectDiscipline(
    boqVersionId: string,
    input: UpdateProjectDisciplineInput,
  ): Promise<ProjectDisciplineRow> {
    await boqVersionService.assertEditable(boqVersionId);

    const existing = await prisma.project_disciplines.findFirst({
      where: {
        project_discipline_id: input.project_discipline_id,
        boq_version_id: boqVersionId,
      },
    });
    if (!existing) {
      throw new AppError("ไม่พบ project discipline", "PROJECT_DISCIPLINE_NOT_FOUND", 404);
    }

    const row = await prisma.project_disciplines.update({
      where: { project_discipline_id: input.project_discipline_id },
      data: {
        included_flag: input.included_flag,
        scope_description: input.scope_description,
        exclusion_note: input.exclusion_note,
        risk_level: input.risk_level,
      },
      include: projectDisciplineInclude,
    });

    return formatProjectDiscipline(row);
  },

  /** For validation engine (Sprint 3C+) — included disciplines with zero BOQ lines */
  async findIncludedWithoutLines(boqVersionId: string) {
    const rows = await prisma.project_disciplines.findMany({
      where: {
        boq_version_id: boqVersionId,
        included_flag: true,
        boq_lines: { none: {} },
      },
      include: {
        discipline: { select: { discipline_code: true, discipline_name: true } },
      },
    });
    return rows;
  },
};
