import Link from "next/link";
import { notFound } from "next/navigation";
import { ValidationPanel } from "@/components/boq/validation-panel";
import { loadValidationPanel } from "@/lib/actions/validation.actions";

export const dynamic = "force-dynamic";

export default async function ValidationPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const result = await loadValidationPanel(projectId, boqVersionId);

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
          <h1 className="text-2xl font-semibold">Validation Panel</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {result.version.project_name} · BOQ v{result.version.version_no} ·{" "}
            {result.version.status} · Lock: {result.version.lock_status}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`${hubPath}/approval`}
            className={
              result.gate.can_approve
                ? "text-blue-600 hover:underline"
                : "pointer-events-none text-neutral-400"
            }
            aria-disabled={!result.gate.can_approve}
          >
            → Approval
          </Link>
          <Link
            href={`${hubPath}/handoff`}
            className={
              result.gate.can_handoff
                ? "text-blue-600 hover:underline"
                : "pointer-events-none text-neutral-400"
            }
            aria-disabled={!result.gate.can_handoff}
          >
            → Handoff
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        แสดงผลจาก validation_results join validation_rules — unresolved BLOCK
        จะปิดการใช้งานปุ่ม Approval และ Handoff
      </p>

      <div className="mt-8">
        <ValidationPanel
          projectId={projectId}
          boqVersionId={boqVersionId}
          initialResults={result.results}
          initialGate={result.gate}
          isEditable={result.is_editable}
        />
      </div>
    </main>
  );
}
