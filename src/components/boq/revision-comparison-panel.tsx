"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  BoqVersionOption,
  RevisionComparisonResult,
} from "@/lib/services/revision-comparison.service";
import { compareRevisions } from "@/lib/actions/comparison.actions";

type RevisionComparisonPanelProps = {
  projectId: string;
  boqVersionId: string;
  versions: BoqVersionOption[];
  initialComparison: RevisionComparisonResult | null;
  initialBaselineId: string | null;
};

function ChangeTable({
  title,
  headers,
  rows,
  emptyMessage,
}: {
  title: string;
  headers: [string, string, string];
  rows: { key: string; col1: string; col2: string; col3: string }[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="font-medium text-neutral-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-600">
                {headers.map((h) => (
                  <th key={h} className="px-2 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-neutral-100">
                  <td className="px-2 py-2">{row.col1}</td>
                  <td className="px-2 py-2">{row.col2}</td>
                  <td className="px-2 py-2 text-neutral-600">{row.col3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDelta(n: number, currency = "") {
  const sign = n > 0 ? "+" : "";
  const prefix = currency ? `${currency} ` : "";
  return `${prefix}${sign}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function RevisionComparisonPanel({
  projectId,
  boqVersionId,
  versions,
  initialComparison,
  initialBaselineId,
}: RevisionComparisonPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comparison, setComparison] = useState(initialComparison);
  const [baselineId, setBaselineId] = useState(initialBaselineId ?? "");
  const [error, setError] = useState<string | null>(null);

  const current = versions.find((v) => v.boq_version_id === boqVersionId);
  const baselineOptions = versions.filter(
    (v) => v.boq_version_id !== boqVersionId,
  );

  const handleCompare = () => {
    if (!baselineId) return;
    setError(null);
    startTransition(async () => {
      const res = await compareRevisions(projectId, boqVersionId, baselineId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setComparison(res.comparison);
      router.refresh();
    });
  };

  if (!current) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-medium">Revision Selector</h2>
        <p className="mt-1 text-sm text-neutral-600">
          เปรียบเทียบ BOQ v{current.version_no} (ปัจจุบัน) กับ revision ก่อนหน้า
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Revision ปัจจุบัน</span>
            <select
              disabled
              className="rounded border border-neutral-300 bg-neutral-50 px-3 py-2"
              value={current.boq_version_id}
            >
              <option value={current.boq_version_id}>
                v{current.version_no} — {current.status} ({current.lock_status})
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">เปรียบเทียบกับ</span>
            <select
              className="rounded border border-neutral-300 px-3 py-2"
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value)}
              disabled={baselineOptions.length === 0 || pending}
            >
              <option value="">— เลือก revision —</option>
              {baselineOptions.map((v) => (
                <option key={v.boq_version_id} value={v.boq_version_id}>
                  v{v.version_no} — {v.status} ({v.lock_status})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleCompare}
            disabled={!baselineId || pending}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "กำลังเปรียบเทียบ…" : "เปรียบเทียบ"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      {comparison ? (
        <>
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-lg font-medium text-blue-900">Difference Summary</h2>
            <p className="mt-1 text-sm text-blue-800">
              v{comparison.baseline.version_no} → v{comparison.current.version_no} ·{" "}
              <span className="font-semibold">
                {comparison.summary.total_changes} การเปลี่ยนแปลงทั้งหมด
              </span>
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded bg-white/80 px-3 py-2">
                <dt className="text-xs text-neutral-600">Document</dt>
                <dd className="font-medium">
                  +{comparison.summary.documents.added} / −
                  {comparison.summary.documents.removed} / ~
                  {comparison.summary.documents.modified}
                </dd>
              </div>
              <div className="rounded bg-white/80 px-3 py-2">
                <dt className="text-xs text-neutral-600">Discipline</dt>
                <dd className="font-medium">
                  Inc {comparison.summary.disciplines.included} · Exc{" "}
                  {comparison.summary.disciplines.excluded} · Risk{" "}
                  {comparison.summary.disciplines.risk_changes}
                </dd>
              </div>
              <div className="rounded bg-white/80 px-3 py-2">
                <dt className="text-xs text-neutral-600">Cost</dt>
                <dd className="font-medium">
                  {comparison.summary.cost.category_changes} category · margin{" "}
                  {comparison.summary.cost.has_margin_change ? "เปลี่ยน" : "—"}
                </dd>
              </div>
              <div className="rounded bg-white/80 px-3 py-2">
                <dt className="text-xs text-neutral-600">Workflow</dt>
                <dd className="font-medium">{comparison.summary.workflow.total} รายการ</dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChangeTable
              title="Document Changes — Added"
              headers={["ชื่อ", "ประเภท", "รายละเอียด"]}
              rows={comparison.documents.added.map((r) => ({
                key: `add-${r.document_id}`,
                col1: r.document_name,
                col2: r.document_type,
                col3: r.detail,
              }))}
              emptyMessage="ไม่มีเอกสารเพิ่ม"
            />
            <ChangeTable
              title="Document Changes — Removed"
              headers={["ชื่อ", "ประเภท", "รายละเอียด"]}
              rows={comparison.documents.removed.map((r) => ({
                key: `rem-${r.document_id}`,
                col1: r.document_name,
                col2: r.document_type,
                col3: r.detail,
              }))}
              emptyMessage="ไม่มีเอกสารถอน"
            />
          </div>
          <ChangeTable
            title="Document Changes — Modified"
            headers={["ชื่อ", "ประเภท", "รายละเอียด"]}
            rows={comparison.documents.modified.map((r) => ({
              key: `mod-${r.document_id}`,
              col1: r.document_name,
              col2: r.document_type,
              col3: r.detail,
            }))}
            emptyMessage="ไม่มีเอกสารแก้ไข"
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <ChangeTable
              title="Discipline — Included"
              headers={["รหัส", "ชื่อ", "รายละเอียด"]}
              rows={comparison.disciplines.included.map((r) => ({
                key: `inc-${r.discipline_id}`,
                col1: r.discipline_code,
                col2: r.discipline_name,
                col3: r.detail,
              }))}
              emptyMessage="ไม่มีสาขา Included เพิ่ม"
            />
            <ChangeTable
              title="Discipline — Excluded"
              headers={["รหัส", "ชื่อ", "รายละเอียด"]}
              rows={comparison.disciplines.excluded.map((r) => ({
                key: `exc-${r.discipline_id}`,
                col1: r.discipline_code,
                col2: r.discipline_name,
                col3: r.detail,
              }))}
              emptyMessage="ไม่มีสาขา Excluded"
            />
            <ChangeTable
              title="Discipline — Risk Changes"
              headers={["รหัส", "ชื่อ", "รายละเอียด"]}
              rows={comparison.disciplines.risk_changes.map((r) => ({
                key: `risk-${r.discipline_id}`,
                col1: r.discipline_code,
                col2: r.discipline_name,
                col3: r.detail,
              }))}
              emptyMessage="ไม่มีการเปลี่ยน Risk"
            />
          </div>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="font-medium text-neutral-900">Cost Changes</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div className="rounded border border-neutral-100 p-3 text-sm">
                <p className="font-medium text-neutral-700">Grand Total (Subtotal)</p>
                <p className="mt-1">
                  {comparison.cost.grand_total.subtotal_before_margin.before.toLocaleString()}{" "}
                  →{" "}
                  {comparison.cost.grand_total.subtotal_before_margin.after.toLocaleString()}
                </p>
                <p className="text-neutral-600">
                  Δ {formatDelta(comparison.cost.grand_total.subtotal_before_margin.delta)}
                </p>
              </div>
              <div className="rounded border border-neutral-100 p-3 text-sm">
                <p className="font-medium text-neutral-700">Selling Price</p>
                <p className="mt-1">
                  {comparison.cost.grand_total.selling_price.before.toLocaleString()} →{" "}
                  {comparison.cost.grand_total.selling_price.after.toLocaleString()}
                </p>
                <p className="text-neutral-600">
                  Δ {formatDelta(comparison.cost.grand_total.selling_price.delta)}
                </p>
              </div>
              <div className="rounded border border-neutral-100 p-3 text-sm">
                <p className="font-medium text-neutral-700">Margin %</p>
                <p className="mt-1">
                  {comparison.cost.margin.margin_percent.before}% →{" "}
                  {comparison.cost.margin.margin_percent.after}%
                </p>
                <p className="text-neutral-600">
                  Δ {formatDelta(comparison.cost.margin.margin_percent.delta)}%
                </p>
              </div>
            </div>
            {comparison.cost.category_totals.length > 0 ? (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-neutral-600">
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Before</th>
                    <th className="py-2 pr-4">After</th>
                    <th className="py-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.cost.category_totals.map((c) => (
                    <tr key={c.field} className="border-b border-neutral-100">
                      <td className="py-2 pr-4">{c.label}</td>
                      <td className="py-2 pr-4">{c.before.toLocaleString()}</td>
                      <td className="py-2 pr-4">{c.after.toLocaleString()}</td>
                      <td className="py-2">{formatDelta(c.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">ไม่มี category total เปลี่ยน</p>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="font-medium text-neutral-900">Workflow Changes</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {comparison.workflow.status ? (
                <li>
                  <span className="font-medium">Status:</span>{" "}
                  {comparison.workflow.status.before} → {comparison.workflow.status.after}
                </li>
              ) : null}
              {comparison.workflow.lock ? (
                <li>
                  <span className="font-medium">Lock:</span>{" "}
                  {comparison.workflow.lock.before} → {comparison.workflow.lock.after}
                </li>
              ) : null}
              {comparison.workflow.approval ? (
                <li>
                  <span className="font-medium">Approval:</span>{" "}
                  {comparison.workflow.approval.before_stage ?? "—"} (
                  {comparison.workflow.approval.before_status ?? "—"}) →{" "}
                  {comparison.workflow.approval.after_stage ?? "—"} (
                  {comparison.workflow.approval.after_status ?? "—"})
                </li>
              ) : null}
              {!comparison.workflow.status &&
              !comparison.workflow.lock &&
              !comparison.workflow.approval ? (
                <li className="text-neutral-500">ไม่มีการเปลี่ยน workflow</li>
              ) : null}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-sm text-neutral-600">
          เลือก revision เปรียบเทียบแล้วกด &quot;เปรียบเทียบ&quot; หรือยังไม่มี revision
          ก่อนหน้าในโปรเจกต์นี้
        </p>
      )}
    </div>
  );
}
