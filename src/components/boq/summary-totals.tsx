"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BoqSummaryView } from "@/lib/services/boq-summary.service";
import {
  refreshBoqSummary,
  updateBoqSummaryMargin,
} from "@/lib/actions/boq-summary.actions";

type SummaryTotalsProps = {
  projectId: string;
  boqVersionId: string;
  summary: BoqSummaryView;
  currency: string;
  isEditable: boolean;
  unmappedCodes: string[];
};

const COST_ROWS: { key: keyof BoqSummaryView; label: string }[] = [
  { key: "total_material_cost", label: "Material" },
  { key: "total_labor_cost", label: "Labor" },
  { key: "total_logistics_cost", label: "Logistics" },
  { key: "total_testing_cost", label: "Testing" },
  { key: "total_documentation_cost", label: "Documentation" },
  { key: "total_indirect_cost", label: "Indirect" },
  { key: "total_risk_cost", label: "Risk" },
  { key: "total_overhead_cost", label: "Overhead" },
];

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function SummaryTotals({
  projectId,
  boqVersionId,
  summary: initialSummary,
  currency,
  isEditable,
  unmappedCodes,
}: SummaryTotalsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState(initialSummary);
  const [marginInput, setMarginInput] = useState(String(summary.margin_percent));
  const [error, setError] = useState<string | null>(null);
  const [unmapped, setUnmapped] = useState(unmappedCodes);

  const handleRefresh = () => {
    setError(null);
    startTransition(async () => {
      const result = await refreshBoqSummary(projectId, boqVersionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
      setMarginInput(String(result.summary.margin_percent));
      setUnmapped(result.unmappedCodes);
      router.refresh();
    });
  };

  const handleMarginSave = () => {
    setError(null);
    const margin = Number(marginInput);
    if (!Number.isFinite(margin)) {
      setError("กรุณาระบุ margin เป็นตัวเลข");
      return;
    }
    startTransition(async () => {
      const result = await updateBoqSummaryMargin(projectId, boqVersionId, {
        margin_percent: margin,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
      setMarginInput(String(result.summary.margin_percent));
      setUnmapped(result.unmappedCodes);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          Roll-up จาก {summary.breakdown_line_count} cost layer
          {summary.updated_at && (
            <span className="text-neutral-400">
              {" "}
              · อัปเดต {new Date(summary.updated_at).toLocaleString("th-TH")}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={pending}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? "กำลังคำนวณ..." : "คำนวณใหม่จาก Cost Layers"}
        </button>
      </div>

      {unmapped.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Category codes ที่ไม่ได้ map ไปยัง summary</p>
          <p className="mt-1">{unmapped.join(", ")}</p>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">
                รายการ
              </th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">
                จำนวนเงิน
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {COST_ROWS.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 text-neutral-800">{row.label}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(summary[row.key] as number, currency)}
                </td>
              </tr>
            ))}
            <tr className="bg-neutral-50 font-medium">
              <td className="px-4 py-3">Subtotal (before margin)</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatMoney(summary.subtotal_before_margin, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="font-semibold text-neutral-900">Pricing</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-neutral-500">Margin %</dt>
            <dd className="mt-1">
              {isEditable ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={marginInput}
                    onChange={(e) => setMarginInput(e.target.value)}
                    className="w-28 rounded-md border border-neutral-300 px-3 py-2 text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={handleMarginSave}
                    disabled={pending}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    บันทึก Margin
                  </button>
                </div>
              ) : (
                <span className="text-lg font-medium tabular-nums">
                  {formatPercent(summary.margin_percent)}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-neutral-500">Selling price</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-800">
              {formatMoney(summary.selling_price, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-neutral-500">Gross profit</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">
              {formatMoney(summary.gross_profit, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-neutral-500">Gross margin %</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">
              {formatPercent(summary.gross_margin_percent)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-neutral-500">
          Selling price = subtotal × (1 + margin%). Gross margin % = gross profit ÷
          selling price.
        </p>
      </div>
    </div>
  );
}
