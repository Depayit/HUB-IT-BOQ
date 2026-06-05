import type { DashboardVariant } from "@/lib/services/project.service";

const styles: Record<DashboardVariant, string> = {
  default: "bg-neutral-100 text-neutral-800",
  warning: "bg-amber-100 text-amber-900",
  block: "bg-red-100 text-red-900",
  success: "bg-emerald-100 text-emerald-900",
};

type StatusBadgeProps = {
  label: string;
  variant?: DashboardVariant;
};

export function StatusBadge({ label, variant = "default" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
