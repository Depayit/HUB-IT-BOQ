import type { validation_severity } from "@prisma/client";

const styles: Record<validation_severity, string> = {
  BLOCK: "bg-red-100 text-red-800",
  WARNING: "bg-amber-100 text-amber-900",
  INFO: "bg-blue-100 text-blue-800",
};

export function SeverityBadge({ severity }: { severity: validation_severity }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}
