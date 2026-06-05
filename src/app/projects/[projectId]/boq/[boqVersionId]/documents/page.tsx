import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentPanel } from "@/components/boq/document-panel";
import { loadDocumentsPage } from "@/lib/actions/document.actions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const result = await loadDocumentsPage(projectId, boqVersionId);

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

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Document Management</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {result.version.project_name} · BOQ v{result.version.version_no} ·{" "}
            {result.version.status} · Lock: {result.version.lock_status}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`${hubPath}/validation`} className="text-blue-600 hover:underline">
            → Validation
          </Link>
        </div>
        {!result.is_editable && (
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700">
            อ่านอย่างเดียว (Locked)
          </span>
        )}
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        จัดการเอกสารโปรเจกต์ (documents) และลิงก์กับ BOQ version (boq_version_documents) —
        dependency_type, is_required, dependency_status
      </p>

      <div className="mt-8">
        <DocumentPanel
          projectId={projectId}
          boqVersionId={boqVersionId}
          boqVersionNo={result.version.version_no}
          documents={result.documents}
          links={result.links}
          dependencySummary={result.dependencySummary}
          stageRequirements={result.stageRequirements}
          missingRequired={result.missingRequired}
          isEditable={result.is_editable}
        />
      </div>
    </main>
  );
}
