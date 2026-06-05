import Link from "next/link";
import { notFound } from "next/navigation";
import { DisciplinePanel } from "@/components/boq/discipline-panel";
import { loadDisciplinesPage } from "@/lib/actions/discipline.actions";

export const dynamic = "force-dynamic";

/**
 * Discipline Selection UI (Sprint 3B).
 * Route: /projects/[projectId]/boq/[boqVersionId]/disciplines
 * (BOQ-scoped because project_disciplines is keyed by boq_version_id.)
 */
export default async function DisciplinesPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const result = await loadDisciplinesPage(projectId, boqVersionId);

  if (!result.ok) {
    if (result.error === "ไม่พบ BOQ Version") notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const base = `/projects/${projectId}/boq/${boqVersionId}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href={base} className="text-sm text-blue-600 hover:underline">
        ← กลับ BOQ Hub
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discipline Selection</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {result.version.project_name} · BOQ v{result.version.version_no} ·{" "}
            {result.version.status} · Lock: {result.version.lock_status}
          </p>
        </div>
        {!result.is_editable && (
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700">
            อ่านอย่างเดียว (Locked)
          </span>
        )}
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        เลือกสาขางานที่รวมใน BOQ กำหนด scope / exclusion และระดับความเสี่ยง — discipline ที่
        include ต้องมี BOQ line ก่อนอนุมัติ (validation ใน sprint ถัดไป)
      </p>

      <div className="mt-8">
        <DisciplinePanel
          projectId={projectId}
          boqVersionId={boqVersionId}
          disciplines={result.disciplines}
          liveFindings={result.liveFindings}
          approvalGate={result.approvalGate}
          isEditable={result.is_editable}
        />
      </div>
    </main>
  );
}
