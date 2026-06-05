import { SeverityBadge } from "@/components/boq/severity-badge";
import type { BoqSummaryReport } from "@/lib/services/boq-summary-report.service";

type SummaryReportSectionsProps = {
  report: BoqSummaryReport;
};

function SummarySection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryFieldGrid({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-sm text-neutral-500">{item.label}</dt>
          <dd className="mt-1 font-medium text-neutral-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function SummaryReportSections({ report }: SummaryReportSectionsProps) {
  const { project, document, discipline, cost, validation } = report;

  return (
    <div className="space-y-6">
      <SummarySection title="Project Summary" id="project-summary">
        <SummaryFieldGrid
          items={[
            { label: "Project Name", value: project.project_name },
            { label: "BOQ Version", value: `v${project.boq_version_no}` },
            { label: "Workflow Status", value: project.workflow_status },
            { label: "Approval Status", value: project.approval_status },
            { label: "Lock Status", value: project.lock_status },
            { label: "Handoff Status", value: project.handoff_status },
          ]}
        />
      </SummarySection>

      <SummarySection title="Document Summary" id="document-summary">
        <SummaryFieldGrid
          items={[
            { label: "Total Documents", value: document.total_documents },
            { label: "Required Documents", value: document.required_documents },
            { label: "Missing Documents", value: document.missing_documents },
            {
              label: "Document Validation Status",
              value: document.document_validation_status,
            },
          ]}
        />
      </SummarySection>

      <SummarySection title="Discipline Summary" id="discipline-summary">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-neutral-600">
              Included ({discipline.included_disciplines.length})
            </h3>
            {discipline.included_disciplines.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">—</p>
            ) : (
              <ul className="mt-2 list-inside list-disc text-sm text-neutral-800">
                {discipline.included_disciplines.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-600">
              Excluded ({discipline.excluded_disciplines.length})
            </h3>
            {discipline.excluded_disciplines.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">—</p>
            ) : (
              <ul className="mt-2 list-inside list-disc text-sm text-neutral-800">
                {discipline.excluded_disciplines.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {discipline.blocked_disciplines.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <h3 className="text-sm font-medium text-amber-900">
              Blocked Disciplines
            </h3>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
              {discipline.blocked_disciplines.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-medium text-neutral-600">
            Risk Summary (included)
          </h3>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1">
              Low: {discipline.risk_summary.low}
            </span>
            <span className="rounded-full bg-yellow-100 px-3 py-1">
              Medium: {discipline.risk_summary.medium}
            </span>
            <span className="rounded-full bg-orange-100 px-3 py-1">
              High: {discipline.risk_summary.high}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1">
              Critical: {discipline.risk_summary.critical}
            </span>
          </div>
        </div>
      </SummarySection>

      <SummarySection title="Cost Summary" id="cost-summary">
        <div className="overflow-hidden rounded-md border border-neutral-100">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-neutral-100">
              {(
                [
                  ["Material Total", cost.material_total],
                  ["Labor Total", cost.labor_total],
                  ["Logistics Total", cost.logistics_total],
                  ["Testing Total", cost.testing_total],
                  ["Documentation Total", cost.documentation_total],
                  ["Indirect Total", cost.indirect_total],
                  ["Risk Total", cost.risk_total],
                  ["Overhead Total", cost.overhead_total],
                ] as const
              ).map(([label, value]) => (
                <tr key={label}>
                  <td className="px-4 py-2 text-neutral-700">{label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(value, cost.currency)}
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-50 font-medium">
                <td className="px-4 py-2">Subtotal</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMoney(cost.subtotal, cost.currency)}
                </td>
              </tr>
              <tr className="bg-emerald-50 font-semibold text-emerald-900">
                <td className="px-4 py-2">Grand Total</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMoney(cost.grand_total, cost.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SummarySection>

      <SummarySection title="Validation Summary" id="validation-summary">
        <SummaryFieldGrid
          items={[
            {
              label: "Total Validation Rules",
              value: validation.total_validation_rules,
            },
            { label: "Warning Count", value: validation.warning_count },
            { label: "Block Count", value: validation.block_count },
            { label: "Ready / Not Ready Status", value: validation.ready_status },
            { label: "Validation Status", value: validation.validation_status },
            { label: "Total Results", value: validation.total_results },
            { label: "Unresolved BLOCKs", value: validation.unresolved_blocks },
            { label: "Can Approve", value: validation.can_approve ? "Yes" : "No" },
            { label: "Can Handoff", value: validation.can_handoff ? "Yes" : "No" },
          ]}
        />

        {validation.block_reason && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {validation.block_reason}
          </p>
        )}

        {validation.results.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Rule</th>
                  <th className="px-3 py-2 text-left font-medium">Severity</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {validation.results.map((row) => (
                  <tr key={row.validation_result_id}>
                    <td className="px-3 py-2">{row.rule_code}</td>
                    <td className="px-3 py-2">
                      <SeverityBadge severity={row.severity} />
                    </td>
                    <td className="px-3 py-2">{row.result_status}</td>
                    <td className="px-3 py-2 text-neutral-600">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SummarySection>
    </div>
  );
}
