"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisciplineStatusBadge } from "@/components/boq/discipline-status-badge";
import {
  updateProjectDisciplineAction,
  type DisciplinesPageRow,
} from "@/lib/actions/discipline.actions";
import type { WorkflowGate } from "@/lib/services/validation.service";
import type { DisciplineValidationFinding } from "@/lib/validations/discipline-workflow";
import { RISK_LEVELS, type RiskLevel } from "@/lib/validations/discipline";

type DisciplinePanelProps = {
  projectId: string;
  boqVersionId: string;
  disciplines: DisciplinesPageRow[];
  liveFindings: DisciplineValidationFinding[];
  approvalGate: WorkflowGate;
  isEditable: boolean;
};

const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-neutral-100 disabled:text-neutral-500";

export function DisciplinePanel({
  projectId,
  boqVersionId,
  disciplines: initialDisciplines,
  liveFindings,
  approvalGate,
  isEditable,
}: DisciplinePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [disciplines, setDisciplines] = useState(initialDisciplines);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const base = `/projects/${projectId}/boq/${boqVersionId}`;

  const findingsByDiscipline = useMemo(() => {
    const map = new Map<string, DisciplineValidationFinding[]>();
    for (const f of liveFindings) {
      const list = map.get(f.target_object_id) ?? [];
      list.push(f);
      map.set(f.target_object_id, list);
    }
    return map;
  }, [liveFindings]);

  const blockFindings = liveFindings.filter((f) => f.severity === "BLOCK");
  const warningFindings = liveFindings.filter((f) => f.severity === "WARNING");

  const persistRow = (
    row: DisciplinesPageRow,
    patch: Partial<
      Pick<
        DisciplinesPageRow,
        "included_flag" | "scope_description" | "exclusion_note" | "risk_level"
      >
    >,
  ) => {
    const next = { ...row, ...patch };
    setError(null);
    setSavingId(row.project_discipline_id);
    startTransition(async () => {
      const result = await updateProjectDisciplineAction(projectId, boqVersionId, {
        project_discipline_id: row.project_discipline_id,
        included_flag: next.included_flag,
        scope_description: next.scope_description,
        exclusion_note: next.exclusion_note,
        risk_level: next.risk_level,
      });
      setSavingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDisciplines((prev) =>
        prev.map((d) =>
          d.project_discipline_id === row.project_discipline_id ? result.discipline : d,
        ),
      );
      router.refresh();
    });
  };

  const onToggleInclude = (row: DisciplinesPageRow) => {
    if (!isEditable || pending) return;
    persistRow(row, { included_flag: !row.included_flag });
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!approvalGate.can_approve && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          data-testid="approval-blocked-banner"
        >
          <p className="font-medium">Approval blocked</p>
          <p className="mt-1">{approvalGate.block_reason}</p>
          <p className="mt-2">
            <Link href={`${base}/approval`} className="underline">
              Approval Workflow
            </Link>
            {" · "}
            <Link href={`${base}/validation`} className="underline">
              Validation Panel
            </Link>
          </p>
        </div>
      )}

      {(blockFindings.length > 0 || warningFindings.length > 0) && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
          data-testid="discipline-validation-warnings"
        >
          <p className="font-medium">Discipline validation</p>
          {blockFindings.map((f) => (
            <p key={`${f.rule_code}-${f.target_object_id}`} className="mt-1 text-red-800">
              BLOCK: {f.message}
            </p>
          ))}
          {warningFindings.map((f) => (
            <p key={`${f.rule_code}-${f.target_object_id}`} className="mt-1 text-amber-900">
              WARN: {f.message}
            </p>
          ))}
        </div>
      )}

      {!isEditable && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          BOQ ถูกล็อก — ดูข้อมูลได้อย่างเดียว
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Code</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Name</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">BOQ Lines</th>
              <th className="px-3 py-2 text-center font-medium text-neutral-600">Include</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Scope</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Exclusion</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Risk</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Alerts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {disciplines.map((row) => {
              const isSaving = savingId === row.project_discipline_id;
              const rowFindings = findingsByDiscipline.get(row.project_discipline_id) ?? [];
              return (
                <tr
                  key={row.project_discipline_id}
                  className={row.workflow_status === "Blocked" ? "bg-red-50/50" : undefined}
                  data-discipline-code={row.discipline_code}
                >
                  <td className="px-3 py-3 font-mono text-xs">{row.discipline_code}</td>
                  <td className="px-3 py-3 font-medium">{row.discipline_name}</td>
                  <td className="px-3 py-3">
                    <DisciplineStatusBadge status={row.workflow_status} />
                  </td>
                  <td className="px-3 py-3 tabular-nums">{row.boq_line_count}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.included_flag}
                      disabled={!isEditable || pending}
                      onClick={() => onToggleInclude(row)}
                      className={`relative inline-flex h-6 w-11 rounded-full ${
                        row.included_flag ? "bg-green-600" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow ${
                          row.included_flag ? "translate-x-5" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      className={inputClass}
                      rows={2}
                      disabled={!isEditable || pending}
                      value={row.scope_description ?? ""}
                      data-testid={`scope-${row.discipline_code}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDisciplines((prev) =>
                          prev.map((d) =>
                            d.project_discipline_id === row.project_discipline_id
                              ? { ...d, scope_description: value || null }
                              : d,
                          ),
                        );
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim() || null;
                        const current = disciplines.find(
                          (d) => d.project_discipline_id === row.project_discipline_id,
                        );
                        if (!current || value === (current.scope_description ?? null)) return;
                        persistRow(current, { scope_description: value });
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      className={inputClass}
                      rows={2}
                      disabled={!isEditable || pending}
                      value={row.exclusion_note ?? ""}
                      data-testid={`exclusion-${row.discipline_code}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDisciplines((prev) =>
                          prev.map((d) =>
                            d.project_discipline_id === row.project_discipline_id
                              ? { ...d, exclusion_note: value || null }
                              : d,
                          ),
                        );
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim() || null;
                        const current = disciplines.find(
                          (d) => d.project_discipline_id === row.project_discipline_id,
                        );
                        if (!current || value === (current.exclusion_note ?? null)) return;
                        persistRow(current, { exclusion_note: value });
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className={inputClass}
                      disabled={!isEditable || pending}
                      value={row.risk_level}
                      data-testid={`risk-${row.discipline_code}`}
                      onChange={(e) => persistRow(row, { risk_level: e.target.value as RiskLevel })}
                    >
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    {isSaving && <span className="text-xs text-neutral-400">Saving…</span>}
                  </td>
                  <td className="px-3 py-3 text-xs max-w-[12rem]">
                    {rowFindings.length === 0
                      ? "—"
                      : rowFindings.map((f) => (
                          <p
                            key={f.rule_code}
                            className={f.severity === "BLOCK" ? "text-red-700" : "text-amber-800"}
                          >
                            {f.message}
                          </p>
                        ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
