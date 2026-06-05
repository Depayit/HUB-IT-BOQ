import Link from "next/link";
import { notFound } from "next/navigation";
import { BoqLineGrid } from "@/components/boq/boq-line-grid";
import { getBoqLinesPageData } from "@/lib/actions/boq-line.actions";

export const dynamic = "force-dynamic";

export default async function BoqLinesPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const result = await getBoqLinesPageData(projectId, boqVersionId);

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
          <h1 className="text-2xl font-semibold">BOQ Line Builder</h1>
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
        ฟิลด์บังคับ: unit, quantity — Critical lines ต้องมี cost layer รวม &gt; 0 จึงผ่าน
        validation
      </p>

      <div className="mt-8">
        <BoqLineGrid
          projectId={projectId}
          boqVersionId={boqVersionId}
          lines={result.lines}
          disciplines={result.disciplines}
          isEditable={result.is_editable}
          criticalFailureCount={result.critical_failure_count}
        />
      </div>
    </main>
  );
}
