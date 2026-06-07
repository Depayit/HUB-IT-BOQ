"use server";

import { revalidatePath } from "next/cache";
import {
  disciplineService,
  type ProjectDisciplineRow,
} from "@/lib/services/discipline.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { validationService } from "@/lib/services/validation.service";
import { evaluateDisciplineValidation } from "@/lib/validations/discipline-validation";
import { toUserMessage } from "@/lib/utils/errors";
import {
  RISK_LEVELS,
  saveProjectDisciplineSchema,
  updateProjectDisciplineSchema,
} from "@/lib/validations/discipline";

function revalidateDisciplinePaths(projectId: string, boqVersionId: string) {
  const base = `/projects/${projectId}/boq/${boqVersionId}`;
  revalidatePath(base);
  revalidatePath(`${base}/disciplines`);
  revalidatePath(`${base}/lines`);
  revalidatePath(`${base}/validation`);
  revalidatePath(`/projects/${projectId}`);
}

export async function loadDisciplinesPage(projectId: string, boqVersionId: string) {
  try {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "ไม่พบ BOQ Version" };
    }

    const [masters, disciplines, approvalGate] = await Promise.all([
      disciplineService.listDisciplines(),
      disciplineService.getProjectDisciplines(projectId, boqVersionId),
      validationService.getWorkflowGate(boqVersionId),
    ]);

    const liveFindings = evaluateDisciplineValidation(
      disciplines.map((d) => ({
        project_discipline_id: d.project_discipline_id,
        discipline_id: d.discipline_id,
        discipline_code: d.discipline_code,
        discipline_name: d.discipline_name,
        included_flag: d.included_flag,
        scope_description: d.scope_description,
        exclusion_note: d.exclusion_note,
        risk_level: d.risk_level,
        boq_line_count: d.boq_line_count,
      })),
    );

    return {
      ok: true as const,
      version: {
        boq_version_id: version.boq_version_id,
        version_no: version.version_no,
        status: version.status,
        lock_status: version.lock_status,
        project_name: version.project.project_name,
      },
      masters,
      disciplines,
      liveFindings,
      approvalGate,
      riskLevels: RISK_LEVELS,
      is_editable: version.lock_status !== "Locked",
    };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function saveProjectDisciplineAction(
  projectId: string,
  boqVersionId: string,
  input: unknown,
) {
  try {
    const data = saveProjectDisciplineSchema.parse(input);
    const row = await disciplineService.saveProjectDiscipline(projectId, boqVersionId, data);
    revalidateDisciplinePaths(projectId, boqVersionId);
    return { ok: true as const, discipline: row };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export async function updateProjectDisciplineAction(
  projectId: string,
  boqVersionId: string,
  input: unknown,
) {
  try {
    const data = updateProjectDisciplineSchema.parse(input);
    const row = await disciplineService.updateProjectDiscipline(boqVersionId, data);
    revalidateDisciplinePaths(projectId, boqVersionId);
    return { ok: true as const, discipline: row };
  } catch (error) {
    return { ok: false as const, error: toUserMessage(error) };
  }
}

export type DisciplinesPageRow = ProjectDisciplineRow;
