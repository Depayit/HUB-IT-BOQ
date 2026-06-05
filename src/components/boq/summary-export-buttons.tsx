"use client";

type SummaryExportButtonsProps = {
  projectId: string;
  boqVersionId: string;
};

export function SummaryExportButtons({
  projectId,
  boqVersionId,
}: SummaryExportButtonsProps) {
  const base = `/api/projects/${projectId}/boq/${boqVersionId}/export`;

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`${base}?format=xlsx`}
        download
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Export Excel (.xlsx)
      </a>
      <a
        href={`${base}?format=pdf`}
        download
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Export PDF
      </a>
    </div>
  );
}
