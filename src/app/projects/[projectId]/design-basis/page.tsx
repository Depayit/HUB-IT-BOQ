import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignBasisPanel } from "@/components/boq/design-basis-panel";
import { getDesignBasisPageData } from "@/lib/actions/design-basis.actions";
import { getProject } from "@/lib/actions/project.actions";

export const dynamic = "force-dynamic";

export default async function DesignBasisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [projectResult, designResult] = await Promise.all([
    getProject(projectId),
    getDesignBasisPageData(projectId),
  ]);

  if (!projectResult.ok) {
    if (projectResult.error === "ไม่พบโปรเจกต์") notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{projectResult.error}</p>
      </main>
    );
  }

  if (!designResult.ok) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{designResult.error}</p>
      </main>
    );
  }

  const project = projectResult.project;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href={`/projects/${projectId}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← กลับโปรเจกต์
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Design Basis</h1>
      <p className="mt-1 text-sm text-neutral-600">
        ตาราง design_basis_versions — อนุมัติ BOQ ได้เมื่อเวอร์ชันล่าสุดเป็น{" "}
        <strong>Approved</strong>
      </p>

      <div className="mt-8">
        <DesignBasisPanel
          projectId={projectId}
          projectName={project.project_name}
          versions={designResult.versions}
          gate={designResult.gate}
          projectDefaults={{
            it_load_kw: project.it_load_kw ?? undefined,
            rack_count: project.rack_count,
          }}
        />
      </div>
    </main>
  );
}
