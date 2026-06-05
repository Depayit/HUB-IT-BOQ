import Link from "next/link";
import { notFound } from "next/navigation";
import { SummaryExportButtons } from "@/components/boq/summary-export-buttons";
import { SummaryReportSections } from "@/components/boq/summary-report-sections";
import { SummaryTotals } from "@/components/boq/summary-totals";
import {
  loadBoqSummary,
  loadBoqSummaryReport,
} from "@/lib/actions/boq-summary.actions";

export const dynamic = "force-dynamic";

export default async function BoqSummaryPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;
  const [reportResult, costResult] = await Promise.all([
    loadBoqSummaryReport(projectId, boqVersionId),
    loadBoqSummary(projectId, boqVersionId),
  ]);

  if (!reportResult.ok) {
    if (reportResult.error === "ไม่พบ BOQ Version") notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{reportResult.error}</p>
      </main>
    );
  }

  if (!costResult.ok) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{costResult.error}</p>
      </main>
    );
  }

  const { report } = reportResult;
  const hubPath = `/projects/${projectId}/boq/${boqVersionId}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href={hubPath} className="text-sm text-blue-600 hover:underline">
        ← กลับ BOQ Hub
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">BOQ Summary Report</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {report.project.project_name} · BOQ v{report.project.boq_version_no} ·{" "}
            {report.project.workflow_status} · สร้างเมื่อ{" "}
            {new Date(report.generated_at).toLocaleString("th-TH")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {!reportResult.is_editable && (
            <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700">
              อ่านอย่างเดียว (Locked)
            </span>
          )}
          <SummaryExportButtons
            projectId={projectId}
            boqVersionId={boqVersionId}
          />
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-4 border-b border-neutral-200 pb-3 text-sm">
        <a href="#project-summary" className="text-blue-600 hover:underline">
          Project
        </a>
        <a href="#document-summary" className="text-blue-600 hover:underline">
          Documents
        </a>
        <a href="#discipline-summary" className="text-blue-600 hover:underline">
          Disciplines
        </a>
        <a href="#cost-summary" className="text-blue-600 hover:underline">
          Cost
        </a>
        <a href="#validation-summary" className="text-blue-600 hover:underline">
          Validation
        </a>
        <a href="#cost-roll-up" className="text-blue-600 hover:underline">
          Cost Roll-up
        </a>
      </nav>

      <div className="mt-8">
        <SummaryReportSections report={report} />
      </div>

      <div id="cost-roll-up" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 className="text-xl font-semibold">Cost Roll-up & Margin</h2>
        <p className="mt-2 text-sm text-neutral-600">
          แก้ไข margin และ refresh roll-up จาก cost layers
        </p>

        {costResult.summary.breakdown_line_count === 0 ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <p className="font-medium">ยังไม่มี cost layers ใน BOQ version นี้</p>
            <p className="mt-1">
              เพิ่ม cost layers ใน BOQ lines ก่อน จากนั้นกด &quot;คำนวณใหม่จาก Cost
              Layers&quot; เพื่อ roll-up
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <SummaryTotals
            projectId={projectId}
            boqVersionId={boqVersionId}
            summary={costResult.summary}
            currency={costResult.version.currency}
            isEditable={costResult.is_editable}
            unmappedCodes={costResult.unmappedCodes}
          />
        </div>
      </div>
    </main>
  );
}
