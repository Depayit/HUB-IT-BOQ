type DesignApprovalStatus = "Draft" | "InReview" | "Approved" | "Rejected";

const styles: Record<DesignApprovalStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-800",
  InReview: "bg-amber-100 text-amber-900",
  Approved: "bg-emerald-100 text-emerald-900",
  Rejected: "bg-red-100 text-red-900",
};

export function DesignBasisStatusBadge({ status }: { status: DesignApprovalStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
