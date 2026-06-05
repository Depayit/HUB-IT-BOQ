"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SeverityBadge } from "@/components/boq/severity-badge";
import type { ValidationResultRow } from "@/lib/services/validation.service";
import type { WorkflowGate } from "@/lib/services/validation.service";
import {
  overrideValidationResult,
  resolveValidationResult,
  runBoqValidation,
} from "@/lib/actions/validation.actions";

type ValidationPanelProps = {
  projectId: string;
  boqVersionId: string;
  initialResults: ValidationResultRow[];
  initialGate: WorkflowGate;
  isEditable: boolean;
};

function isUnresolvedBlockRow(row: ValidationResultRow) {
  return (
    row.severity === "BLOCK" &&
    !row.resolved_flag &&
    row.result_status !== "Pass" &&
    row.result_status !== "Overridden"
  );
}

export function ValidationPanel({
  projectId,
  boqVersionId,
  initialResults,
  initialGate,
  isEditable,
}: ValidationPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState(initialResults);
  const [gate, setGate] = useState(initialGate);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleRunValidation = () => {
    setError(null);
    startTransition(async () => {
      const res = await runBoqValidation(projectId, boqVersionId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResults(res.results);
      setGate(res.gate);
      refresh();
    });
  };

  const handleResolve = (validationResultId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await resolveValidationResult(
        projectId,
        boqVersionId,
        validationResultId,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGate(res.gate);
      refresh();
    });
  };

  const handleOverride = (validationResultId: string) => {
    const reason = window.prompt("ระบุ override reason (บังคับ):");
    if (!reason?.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await overrideValidationResult(
        projectId,
        boqVersionId,
        validationResultId,
        { override_reason: reason },
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGate(res.gate);
      refresh();
    });
  };

  return (
    <div className="space-y-6">
      {gate.unresolved_block_count > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">
            มี unresolved BLOCK {gate.unresolved_block_count} รายการ
          </p>
          <p className="mt-1">
            ปุ่มอนุมัติ (Approval) และ Handoff ถูกปิดใช้งานจนกว่าจะแก้ไขหรือ resolve
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {results.length} ผลการตรวจสอบ
          {gate.can_approve ? (
            <span className="ml-2 text-emerald-700">· พร้อมอนุมัติ/handoff</span>
          ) : (
            <span className="ml-2 text-red-700">· ถูกบล็อก</span>
          )}
        </p>
        {isEditable && (
          <button
            type="button"
            onClick={handleRunValidation}
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "กำลังรัน..." : "รัน Validation"}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Rule</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Group</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Severity</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Target</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Message</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Override</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Resolved</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">By / At</th>
              {isEditable && (
                <th className="px-3 py-2 text-right font-medium text-neutral-600">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {results.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditable ? 10 : 9}
                  className="px-3 py-8 text-center text-neutral-500"
                >
                  ยังไม่มีผล validation — กด &quot;รัน Validation&quot; เพื่อตรวจสอบ
                </td>
              </tr>
            ) : (
              results.map((row) => (
                <tr
                  key={row.validation_result_id}
                  className={
                    isUnresolvedBlockRow(row) ? "bg-red-50/60" : "hover:bg-neutral-50"
                  }
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.rule_code}</td>
                  <td className="px-3 py-2">{row.rule_group}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="block">{row.target_object_type}</span>
                    {row.target_object_id && (
                      <span className="text-xs text-neutral-400">
                        {row.target_object_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-2">{row.message}</td>
                  <td className="px-3 py-2">{row.result_status}</td>
                  <td className="max-w-[8rem] px-3 py-2 text-xs text-neutral-600">
                    {row.override_reason ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.resolved_flag ? (
                      <span className="text-emerald-700">Yes</span>
                    ) : (
                      <span className="text-neutral-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {row.resolved_by ?? "—"}
                    {row.resolved_at && (
                      <span className="block text-neutral-400">
                        {new Date(row.resolved_at).toLocaleString("th-TH")}
                      </span>
                    )}
                  </td>
                  {isEditable && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isUnresolvedBlockRow(row) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResolve(row.validation_result_id)}
                            disabled={pending}
                            className="mr-2 text-blue-600 hover:underline disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOverride(row.validation_result_id)}
                            disabled={pending}
                            className="text-amber-700 hover:underline disabled:opacity-50"
                          >
                            Override
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
