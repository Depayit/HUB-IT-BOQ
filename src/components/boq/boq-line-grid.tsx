"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBoqLine,
  deleteBoqLine,
  updateBoqLine,
} from "@/lib/actions/boq-line.actions";
import { boqLineSchema, type BoqLineInput } from "@/lib/validations/boq-line";
import type { BoqLineClientRow } from "@/lib/services/boq-line.service";

type DisciplineOption = {
  project_discipline_id: string;
  discipline_code: string;
  discipline_name: string;
};

type BoqLineGridProps = {
  projectId: string;
  boqVersionId: string;
  lines: BoqLineClientRow[];
  disciplines: DisciplineOption[];
  isEditable: boolean;
  criticalFailureCount: number;
};

const emptyForm: BoqLineInput = {
  project_discipline_id: "",
  item_id: "",
  item_description: "",
  unit: "",
  quantity: 1,
  cost_source: "",
  confidence_level: "",
  is_critical_line: false,
  notes: "",
};

export function BoqLineGrid({
  projectId,
  boqVersionId,
  lines: initialLines,
  disciplines,
  isEditable,
  criticalFailureCount,
}: BoqLineGridProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState(initialLines);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<BoqLineInput>({
    resolver: zodResolver(boqLineSchema),
    defaultValues: {
      ...emptyForm,
      project_discipline_id: disciplines[0]?.project_discipline_id ?? "",
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    form.reset({
      ...emptyForm,
      project_discipline_id: disciplines[0]?.project_discipline_id ?? "",
    });
  };

  const openCreate = () => {
    setError(null);
    setEditingId(null);
    setShowForm(true);
    form.reset({
      ...emptyForm,
      project_discipline_id: disciplines[0]?.project_discipline_id ?? "",
    });
  };

  const openEdit = (line: BoqLineClientRow) => {
    setError(null);
    setEditingId(line.boq_line_id);
    setShowForm(true);
    form.reset({
      project_discipline_id: line.project_discipline_id,
      item_id: line.item_id ?? "",
      line_no: line.line_no,
      item_description: line.item_description,
      unit: line.unit,
      quantity: line.quantity,
      cost_source: line.cost_source ?? "",
      confidence_level: line.confidence_level ?? "",
      is_critical_line: line.is_critical_line,
      notes: line.notes ?? "",
    });
  };

  const refresh = () => router.refresh();

  const onSubmit = form.handleSubmit((data) => {
    setError(null);
    startTransition(async () => {
      const payload = {
        ...data,
        item_id: data.item_id || null,
        cost_source: data.cost_source || null,
        confidence_level: data.confidence_level || null,
        notes: data.notes || null,
      };

      if (editingId) {
        const result = await updateBoqLine(editingId, boqVersionId, projectId, payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setLines((prev) =>
          prev.map((l) => (l.boq_line_id === editingId ? result.line : l)),
        );
      } else {
        const result = await createBoqLine(boqVersionId, projectId, payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setLines((prev) => [...prev, result.line].sort((a, b) => a.line_no - b.line_no));
      }
      resetForm();
      refresh();
    });
  });

  const onDelete = (boqLineId: string) => {
    if (!confirm("ลบ BOQ line นี้?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBoqLine(boqLineId, boqVersionId, projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLines((prev) => prev.filter((l) => l.boq_line_id !== boqLineId));
      if (editingId === boqLineId) resetForm();
      refresh();
    });
  };

  if (disciplines.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-medium">ยังไม่มี Discipline ที่เลือกใน BOQ version นี้</p>
        <p className="mt-1">
          ต้องตั้งค่า Discipline Selection ก่อนสร้าง BOQ lines (project_disciplines.included_flag
          = true)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {criticalFailureCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">
            Critical line validation: {criticalFailureCount} รายการไม่ผ่าน
          </p>
          <p className="mt-1">
            Critical lines ต้องมี cost layer รวมมากกว่า 0 จึงจะผ่าน validation
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {lines.length} รายการ · unit และ quantity จำเป็นต้องกรอก
        </p>
        {isEditable && (
          <button
            type="button"
            onClick={openCreate}
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            + เพิ่ม BOQ Line
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {showForm && isEditable && (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6"
        >
          <h3 className="font-semibold">{editingId ? "แก้ไข BOQ Line" : "เพิ่ม BOQ Line"}</h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Discipline *" error={form.formState.errors.project_discipline_id?.message}>
              <select className={inputClass} {...form.register("project_discipline_id")}>
                {disciplines.map((d) => (
                  <option key={d.project_discipline_id} value={d.project_discipline_id}>
                    {d.discipline_code} — {d.discipline_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Line No." error={form.formState.errors.line_no?.message}>
              <input
                type="number"
                className={inputClass}
                placeholder="Auto"
                {...form.register("line_no")}
              />
            </Field>
            <Field label="Item ID" error={form.formState.errors.item_id?.message}>
              <input className={inputClass} {...form.register("item_id")} />
            </Field>
          </div>

          <Field label="Item Description *" error={form.formState.errors.item_description?.message}>
            <textarea rows={2} className={inputClass} {...form.register("item_description")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Unit *" error={form.formState.errors.unit?.message}>
              <input className={inputClass} {...form.register("unit")} />
            </Field>
            <Field label="Quantity *" error={form.formState.errors.quantity?.message}>
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                {...form.register("quantity")}
              />
            </Field>
            <Field label="Cost Source" error={form.formState.errors.cost_source?.message}>
              <input className={inputClass} {...form.register("cost_source")} />
            </Field>
            <Field label="Confidence Level" error={form.formState.errors.confidence_level?.message}>
              <input className={inputClass} {...form.register("confidence_level")} />
            </Field>
          </div>

          <Field label="Notes" error={form.formState.errors.notes?.message}>
            <textarea rows={2} className={inputClass} {...form.register("notes")} />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("is_critical_line")} />
            Critical line (ต้องมี cost layer รวม &gt; 0 จึงผ่าน validation)
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "กำลังบันทึก..." : editingId ? "บันทึก" : "สร้าง Line"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={pending}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Line</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Discipline</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Description</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Unit</th>
              <th className="px-3 py-2 text-right font-medium text-neutral-600">Qty</th>
              <th className="px-3 py-2 text-center font-medium text-neutral-600">Critical</th>
              <th className="px-3 py-2 text-right font-medium text-neutral-600">Cost Total</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Validation</th>
              {isEditable && (
                <th className="px-3 py-2 text-right font-medium text-neutral-600">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditable ? 9 : 8}
                  className="px-3 py-8 text-center text-neutral-500"
                >
                  ยังไม่มี BOQ lines
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.boq_line_id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 tabular-nums font-medium">{line.line_no}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{line.discipline_code}</span>
                    <span className="block text-xs text-neutral-500">{line.discipline_name}</span>
                  </td>
                  <td className="max-w-xs px-3 py-2">
                    <p className="truncate">{line.item_description}</p>
                    {line.item_id && (
                      <p className="text-xs text-neutral-500">ID: {line.item_id}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">{line.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                  <td className="px-3 py-2 text-center">
                    {line.is_critical_line ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                        Yes
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {line.cost_layer_total.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    {line.validation.passes ? (
                      <span className="text-emerald-700">Pass</span>
                    ) : (
                      <span className="text-red-700" title={line.validation.message ?? undefined}>
                        BLOCK
                      </span>
                    )}
                  </td>
                  {isEditable && (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(line)}
                        disabled={pending}
                        className="mr-2 text-blue-600 hover:underline disabled:opacity-50"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(line.boq_line_id)}
                        disabled={pending}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        ลบ
                      </button>
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

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
