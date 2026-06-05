import Link from "next/link";
import { notFound } from "next/navigation";
import { RevisionComparisonPanel } from "@/components/boq/revision-comparison-panel";
import { loadRevisionComparison } from "@/lib/actions/comparison.actions";

export const dynamic = "force-dynamic";

export default async function RevisionComparisonPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
  searchParams: Promise<{ baseline?: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const { baseline } = await searchParams;

  const result = await loadRevisionComparison(
    projectId,
    boqVersionId,
    baseline,
  );

  if (!result.ok) {
    if (result.error === "ไม่พบ BOQ Version") notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const hubPath = `/projects/${projectId}/boq/${boqVersionId}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href={hubPath} className="text-sm text-blue-600 hover:underline">
        ← กลับ BOQ Hub
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold">Revision Comparison</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {result.version.project_name} · BOQ v{result.version.version_no} ·{" "}
          {result.version.status} · Lock: {result.version.lock_status}
        </p>
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        เปรียบเทียบ revision ปัจจุบันกับ revision ก่อนหน้า — Document, Discipline,
        Cost และ Workflow
      </p>

      {result.message ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {result.message}
        </div>
      ) : null}

      <div className="mt-8">
        <RevisionComparisonPanel
          projectId={projectId}
          boqVersionId={boqVersionId}
          versions={result.versions}
          initialComparison={result.comparison}
          initialBaselineId={result.baseline_boq_version_id}
        />
      </div>
    </main>
  );
}
