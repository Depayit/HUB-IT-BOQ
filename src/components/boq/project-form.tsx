"use client";

import { useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  projectSetupSchema,
  type ProjectSetupInput,
} from "@/lib/validations/project";
import { createProject, updateProject } from "@/lib/actions/project.actions";

const PROJECT_STATUSES = ["Active", "OnHold", "Archived"] as const;

type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  defaultValues?: Partial<ProjectSetupInput>;
};

export function ProjectForm({ mode, projectId, defaultValues }: ProjectFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<ProjectSetupInput>({
    resolver: zodResolver(projectSetupSchema),
    defaultValues: {
      project_name: "",
      currency: "THB",
      project_status: "Active",
      it_load_kw: 100,
      rack_count: 10,
      ...defaultValues,
    },
  });

  const itLoad = form.watch("it_load_kw");
  const rackCount = form.watch("rack_count");
  const previewDensity = useMemo(() => {
    const load = Number(itLoad);
    const racks = Number(rackCount);
    if (!Number.isFinite(load) || !Number.isFinite(racks) || racks <= 0) return null;
    return (load / racks).toFixed(4);
  }, [itLoad, rackCount]);

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      if (mode === "create") {
        const result = await createProject(data);
        if (result && !result.ok) form.setError("root", { message: result.error });
      } else if (projectId) {
        const result = await updateProject(projectId, data);
        if (result && !result.ok) form.setError("root", { message: result.error });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {form.formState.errors.root && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {form.formState.errors.root.message}
        </p>
      )}

      <Field label="ชื่อโปรเจกต์ *" error={form.formState.errors.project_name?.message}>
        <input className={inputClass} {...form.register("project_name")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client ID" error={form.formState.errors.client_id?.message}>
          <input className={inputClass} {...form.register("client_id")} />
        </Field>
        <Field label="Opportunity ID" error={form.formState.errors.opportunity_id?.message}>
          <input className={inputClass} {...form.register("opportunity_id")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="สถานที่" error={form.formState.errors.location?.message}>
          <input className={inputClass} {...form.register("location")} />
        </Field>
        <Field label="ประเภทโปรเจกต์" error={form.formState.errors.project_type?.message}>
          <input className={inputClass} {...form.register("project_type")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="IT Load (kW) *" error={form.formState.errors.it_load_kw?.message}>
          <input
            type="number"
            step="0.0001"
            className={inputClass}
            {...form.register("it_load_kw")}
          />
        </Field>
        <Field label="จำนวน Rack *" error={form.formState.errors.rack_count?.message}>
          <input type="number" className={inputClass} {...form.register("rack_count")} />
        </Field>
        <Field label="Rack Density (kW/rack)">
          <input
            className={`${inputClass} bg-neutral-100`}
            readOnly
            value={previewDensity ?? "—"}
            tabIndex={-1}
            aria-readonly
          />
          <p className="mt-1 text-xs text-neutral-500">คำนวณอัตโนมัติ: IT Load ÷ Rack Count</p>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tier Target" error={form.formState.errors.tier_target?.message}>
          <input className={inputClass} {...form.register("tier_target")} />
        </Field>
        <Field label="SLA Target" error={form.formState.errors.sla_target?.message}>
          <input className={inputClass} {...form.register("sla_target")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="สกุลเงิน" error={form.formState.errors.currency?.message}>
          <input className={inputClass} {...form.register("currency")} />
        </Field>
        <Field label="VAT Option" error={form.formState.errors.vat_option?.message}>
          <input className={inputClass} {...form.register("vat_option")} />
        </Field>
        <Field label="สถานะโปรเจกต์" error={form.formState.errors.project_status?.message}>
          <select className={inputClass} {...form.register("project_status")}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก..." : mode === "create" ? "สร้างโปรเจกต์" : "บันทึกการแก้ไข"}
      </button>
    </form>
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

