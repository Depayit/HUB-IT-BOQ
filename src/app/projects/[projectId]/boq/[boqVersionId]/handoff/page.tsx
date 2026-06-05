import Link from "next/link";
import { notFound } from "next/navigation";
import { HandoffActions } from "@/components/boq/handoff-actions";
import { WorkflowGateBanner } from "@/components/boq/workflow-gate-banner";
import { loadHandoffPage } from "@/lib/actions/handoff.actions";

export const dynamic = "force-dynamic";

export default async function HandoffPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const result = await loadHandoffPage(projectId, boqVersionId);

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
        <h1 className="text-2xl font-semibold">Handoff Center</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {result.version.project.project_name} · BOQ v{result.version.version_no} ·{" "}
          {result.version.status} · Lock: {result.version.lock_status}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <WorkflowGateBanner
          canProceed={result.can_handoff}
          blockMessages={result.block_messages}
          title="Handoff"
        />

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold">ดำเนินการ Handoff</h2>
          <p className="mt-1 text-sm text-neutral-600">
            ต้อง BOQ Approved + Locked และไม่มี unresolved BLOCK
          </p>
          <div className="mt-4">
            <HandoffActions
              projectId={projectId}
              boqVersionId={boqVersionId}
              initialCanHandoff={result.can_handoff}
              initialBlockMessages={result.block_messages}
            />
          </div>
        </div>

        {result.handoffs.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="font-semibold">ประวัติ Handoff</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {result.handoffs.map((h) => (
                <li key={h.handoff_id} className="border-b border-neutral-100 pb-2">
                  <span className="font-medium">{h.handoff_status}</span>
                  {h.handoff_at && (
                    <span className="ml-2 text-neutral-500">
                      {new Date(h.handoff_at).toLocaleString("th-TH")}
                    </span>
                  )}
                  {h.handed_off_by && (
                    <span className="ml-2 text-neutral-500">by {h.handed_off_by}</span>
                  )}
                  {h.notes && <p className="mt-1 text-neutral-600">{h.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-neutral-500">
          <Link href={`${hubPath}/validation`} className="text-blue-600 hover:underline">
            เปิด Validation Panel
          </Link>{" "}
          เพื่อตรวจ unresolved BLOCK
        </p>
      </div>
    </main>
  );
}
