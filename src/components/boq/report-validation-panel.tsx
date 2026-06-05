"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReportValidationResult } from "@/lib/validations/reporting";
import { REPORT_VALIDATION_CODES } from "@/lib/validations/reporting";
import { runReportValidation } from "@/lib/actions/reporting-validation.actions";

type ReportValidationPanelProps = {
  projectId: string;
  boqVersionId: string;
  initialValidation: ReportValidationResult;
  reportSections: {
    has_project: boolean;
    has_document: boolean;
    has_discipline: boolean;
    has_cost: boolean;
    has_validation: boolean;
  };
};

const RULE_LABELS: Record<(typeof REPORT_VALIDATION_CODES)[number], string> = {
  REPORT_PROJECT_INCOMPLETE: "Project Summary Complete",
  REPORT_DOCUMENT_INCOMPLETE: "Document Summary Complete",
  REPORT_DISCIPLINE_INCOMPLETE: "Discipline Summary Complete",
  REPORT_COST_INCOMPLETE: "Cost Summary Complete",
  REPORT_VALIDATION_INCOMPLETE: "Validation Summary Complete",
  REPORT_EXPORT_NOT_READY: "Export Ready",
};

export function ReportValidationPanel({
  projectId,
  boqVersionId,
  initialValidation,
  reportSections,
}: ReportValidationPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [validation, setValidation] = useState(initialValidation);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = () => {
    setError(null);
    startTransition(async () => {
      const res = await runReportValidation(projectId, boqVersionId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setValidation(res.validation);
      router.refresh();
    });
  };

  const issueCodes = new Set(validation.issues.map((i) => i.code));

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Report Validation</h2>
          <p className="mt-1 text-sm text-neutral-600">
            ตรวจความครบถ้วนของ BOQ Summary Report (Sprint 6D)
          </p>
        </div>
        <button
          type="button"
          onClick={handleValidate}
          disabled={pending}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? "กำลังตรวจ…" : "ตรวจสอบใหม่"}
        </button>
      </div>

      <div
        className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
          validation.is_complete
            ? "border border-green-200 bg-green-50 text-green-900"
            : "border border-red-200 bg-red-50 text-red-900"
        }`}
      >
        {validation.is_complete ? "PASS — รายงานพร้อม export" : "FAIL — รายงานยังไม่ครบ"}
        {validation.is_export_ready ? (
          <span className="ml-2 font-normal">(Export Ready)</span>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {REPORT_VALIDATION_CODES.map((code) => {
          const failed = issueCodes.has(code);
          const issue = validation.issues.find((i) => i.code === code);
          return (
            <li
              key={code}
              className={`flex flex-wrap items-start justify-between gap-2 rounded border px-3 py-2 text-sm ${
                failed
                  ? "border-red-100 bg-red-50/50"
                  : "border-green-100 bg-green-50/50"
              }`}
            >
              <span className="font-medium">{RULE_LABELS[code]}</span>
              <span className={failed ? "text-red-700" : "text-green-700"}>
                {failed ? "FAIL" : "PASS"}
              </span>
              {issue ? (
                <span className="w-full text-xs text-red-600">{issue.message}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <details className="mt-4 text-sm text-neutral-600">
        <summary className="cursor-pointer font-medium">Report sections loaded</summary>
        <ul className="mt-2 list-inside list-disc">
          <li>Project: {reportSections.has_project ? "มี" : "ไม่มี"}</li>
          <li>Document: {reportSections.has_document ? "มี" : "ไม่มี"}</li>
          <li>Discipline: {reportSections.has_discipline ? "มี" : "ไม่มี"}</li>
          <li>Cost: {reportSections.has_cost ? "มี" : "ไม่มี"}</li>
          <li>Validation: {reportSections.has_validation ? "รันแล้ว" : "ยังไม่รัน"}</li>
        </ul>
      </details>
    </section>
  );
}
