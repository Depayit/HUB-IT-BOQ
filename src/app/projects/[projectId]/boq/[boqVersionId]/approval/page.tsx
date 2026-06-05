import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovalActions } from "@/components/boq/approval-actions";
import { WorkflowGateBanner } from "@/components/boq/workflow-gate-banner";
import { loadApprovalPage } from "@/lib/actions/approval.actions";

export const dynamic = "force-dynamic";

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const result = await loadApprovalPage(projectId, boqVersionId);

  if (!result.ok) {
    if (result.error === "ไม่พบ BOQ Version") notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const hubPath = `/projects/${projectId}/boq/${boqVersionId}`;
  const workflow = result.workflow;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href={hubPath} className="text-sm text-blue-600 hover:underline">
        ← กลับ BOQ Hub
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold">Approval Workflow</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {result.version.project.project_name} · BOQ v{result.version.version_no}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <WorkflowGateBanner
          canProceed={result.can_approve}
          blockMessages={result.block_messages}
          title="การอนุมัติ BOQ"
        />

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold">ขั้นตอนอนุมัติ</h2>
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-neutral-700">
            {result.stages.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>

          <div className="mt-6">
            <ApprovalActions
              projectId={projectId}
              boqVersionId={boqVersionId}
              canApprove={result.can_approve}
              currentStage={workflow?.current_stage ?? "Engineer Review"}
              workflowStatus={workflow?.workflow_status ?? "NotStarted"}
              blockMessages={result.block_messages}
            />
          </div>
        </div>

        <p className="text-sm text-neutral-500">
          <Link href={`${hubPath}/validation`} className="text-blue-600 hover:underline">
            เปิด Validation Panel
          </Link>{" "}
          เพื่อแก้ unresolved BLOCK ก่อนอนุมัติ
        </p>
      </div>
    </main>
  );
}
