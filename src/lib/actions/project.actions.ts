"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { projectService } from "@/lib/services/project.service";
import { toUserMessage } from "@/lib/utils/errors";
import { projectSetupSchema, projectUpdateSchema } from "@/lib/validations/project";

export async function getProjectsDashboard() {
  try {
    const projects = await projectService.listWithDashboard();
    return {
      ok: true as const,
      projects: projects.map((p) => ({
        ...projectService.formatForClient(p),
        project_id: p.project_id,
        project_status: p.project_status,
        dashboard: p.dashboard,
        latest_boq_version_no: p.latest_boq_version_no,
      })),
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function getProject(projectId: string) {
  try {
    const project = await projectService.getById(projectId);
    if (!project) return { ok: false as const, error: "ไม่พบโปรเจกต์" };
    return {
      ok: true as const,
      project: {
        ...projectService.formatForClient(project),
        dashboard: project.dashboard,
        boq_versions: project.boq_versions.map((v) => ({
          boq_version_id: v.boq_version_id,
          version_no: v.version_no,
          status: v.status,
          lock_status: v.lock_status,
        })),
      },
    };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function createProject(input: unknown) {
  try {
    const data = projectSetupSchema.parse(input);
    const project = await projectService.create(data);
    revalidatePath("/projects");
    redirect(`/projects/${project.project_id}`);
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}

export async function updateProject(projectId: string, input: unknown) {
  try {
    const data = projectUpdateSchema.parse(input);
    await projectService.update(projectId, data);
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: toUserMessage(e) };
  }
}
