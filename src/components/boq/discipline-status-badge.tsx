import type { DisciplineWorkflowStatus } from "@/lib/validations/discipline-workflow";

const STYLES: Record<DisciplineWorkflowStatus, string> = {
  Included: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Excluded: "bg-neutral-200 text-neutral-700 border-neutral-300",
  Pending: "bg-amber-100 text-amber-900 border-amber-200",
  Blocked: "bg-red-100 text-red-800 border-red-200",
};

export function DisciplineStatusBadge({ status }: { status: DisciplineWorkflowStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
      data-workflow-status={status}
    >
      {status}
    </span>
  );
}
