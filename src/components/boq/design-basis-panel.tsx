"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DesignBasisVersionList,
  type DesignBasisVersionRow,
} from "@/components/boq/design-basis-version-list";
import { DesignBasisStatusBadge } from "@/components/boq/design-basis-status-badge";
import {
  createDesignBasisVersion,
  transitionDesignBasisStatus,
  updateDesignBasisVersion,
} from "@/lib/actions/design-basis.actions";
import { designBasisSchema, type DesignBasisInput } from "@/lib/validations/design-basis";

type GateInfo = {
  can_approve_boq: boolean;
  message: string;
};

type DesignBasisPanelProps = {
  projectId: string;
  projectName: string;
  versions: DesignBasisVersionRow[];
  gate: GateInfo;
  projectDefaults?: { it_load_kw?: number; rack_count?: number };
};

export function DesignBasisPanel({
  projectId,
  projectName,
  versions: initialVersions,
  gate,
  projectDefaults,
}: DesignBasisPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [versions, setVersions] = useState(initialVersions);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialVersions[0]?.design_basis_version_id,
  );
  const [mode, setMode] = useState<"edit" | "create">(
    initialVersions.length === 0 ? "create" : "edit",
  );
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => versions.find((v) => v.design_basis_version_id === selectedId),
    [versions, selectedId],
  );

  const form = useForm<DesignBasisInput>({
    resolver: zodResolver(designBasisSchema),
    values: selected
      ? {
          it_load_assumption_kw: selected.it_load_assumption_kw ?? 0,
          rack_count_assumption: selected.rack_count_assumption,
          power_architecture: selected.power_architecture ?? "",
          cooling_architecture: selected.cooling_architecture ?? "",
          fire_protection_assumption: selected.fire_protection_assumption ?? "",
          monitoring_assumption: selected.monitoring_assumption ?? "",
          redundancy_assumption: selected.redundancy_assumption ?? "",
          technical_compliance_basis: selected.technical_compliance_basis ?? "",
          customer_requirement_reference: selected.customer_requirement_reference ?? "",
        }
      : {
          it_load_assumption_kw: projectDefaults?.it_load_kw ?? 100,
          rack_count_assumption: projectDefaults?.rack_count ?? 10,
          power_architecture: "",
          cooling_architecture: "",
          fire_protection_assumption: "",
          monitoring_assumption: "",
          redundancy_assumption: "",
          technical_compliance_basis: "",
          customer_requirement_reference: "",
        },
  });

  const itLoad = form.watch("it_load_assumption_kw");
  const rackCount = form.watch("rack_count_assumption");
  const densityPreview = useMemo(() => {
    const load = Number(itLoad);
    const racks = Number(rackCount);
    if (!Number.isFinite(load) || !Number.isFinite(racks) || racks <= 0) return null;
    return (load / racks).toFixed(4);
  }, [itLoad, rackCount]);

  const refresh = () => router.refresh();

  const onSave = form.handleSubmit((data) => {
    setError(null);
    startTransition(async () => {
      if (mode === "create") {
        const result = await createDesignBasisVersion(projectId, data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setVersions((prev) => [result.version as DesignBasisVersionRow, ...prev]);
        setSelectedId(result.version.design_basis_version_id);
        setMode("edit");
      } else if (selectedId) {
        const result = await updateDesignBasisVersion(selectedId, projectId, data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setVersions((prev) =>
          prev.map((v) =>
            v.design_basis_version_id === selectedId
              ? (result.version as DesignBasisVersionRow)
              : v,
          ),
        );
      }
      refresh();
    });
  });

  const onStatusAction = (action: "submit" | "approve" | "reject") => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await transitionDesignBasisStatus(projectId, {
        design_basis_version_id: selectedId,
        action,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setVersions((prev) =>
        prev.map((v) =>
          v.design_basis_version_id === selectedId
            ? (result.version as DesignBasisVersionRow)
            : v,
        ),
      );
      refresh();
    });
  };

  const canEditFields =
    mode === "create" || (selected && selected.approval_status !== "Approved");

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">เวอร์ชัน</h2>
          <div className="mt-2">
            <DesignBasisVersionList
              versions={versions}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setMode("edit");
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode("create");
            setSelectedId(undefined);
            form.reset({
              it_load_assumption_kw: projectDefaults?.it_load_kw ?? 100,
              rack_count_assumption: projectDefaults?.rack_count ?? 10,
              power_architecture: "",
              cooling_architecture: "",
              fire_protection_assumption: "",
              monitoring_assumption: "",
              redundancy_assumption: "",
              technical_compliance_basis: "",
              customer_requirement_reference: "",
            });
          }}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
        >
          + สร้างเวอร์ชันใหม่
        </button>
      </aside>

      <div className="space-y-6">
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            gate.can_approve_boq
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-medium">เกณฑ์อนุมัติ BOQ</p>
          <p className="mt-1">{gate.message}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "create"
                ? "สร้าง Design Basis ใหม่"
                : `Design Basis v${selected?.design_version_no ?? "—"}`}
            </h2>
            <p className="text-sm text-neutral-500">{projectName}</p>
          </div>
          {selected && <DesignBasisStatusBadge status={selected.approval_status} />}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <form
          onSubmit={onSave}
          className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="IT Load Assumption (kW) *">
              <input
                type="number"
                step="0.0001"
                disabled={!canEditFields || pending}
                className={inputClass}
                {...form.register("it_load_assumption_kw")}
              />
            </Field>
            <Field label="Rack Count Assumption *">
              <input
                type="number"
                disabled={!canEditFields || pending}
                className={inputClass}
                {...form.register("rack_count_assumption")}
              />
            </Field>
            <Field label="Rack Density Assumption (kW/rack)">
              <input
                readOnly
                className={`${inputClass} bg-neutral-100`}
                value={densityPreview ?? "—"}
                tabIndex={-1}
              />
              <p className="mt-1 text-xs text-neutral-500">คำนวณอัตโนมัติเมื่อบันทึก</p>
            </Field>
          </div>

          <Field label="Power Architecture">
            <textarea
              rows={2}
              disabled={!canEditFields || pending}
              className={inputClass}
              {...form.register("power_architecture")}
            />
          </Field>
          <Field label="Cooling Architecture">
            <textarea
              rows={2}
              disabled={!canEditFields || pending}
              className={inputClass}
              {...form.register("cooling_architecture")}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fire Protection Assumption">
              <textarea
                rows={2}
                disabled={!canEditFields || pending}
                className={inputClass}
                {...form.register("fire_protection_assumption")}
              />
            </Field>
            <Field label="Monitoring Assumption">
              <textarea
                rows={2}
                disabled={!canEditFields || pending}
                className={inputClass}
                {...form.register("monitoring_assumption")}
              />
            </Field>
          </div>
          <Field label="Redundancy Assumption">
            <textarea
              rows={2}
              disabled={!canEditFields || pending}
              className={inputClass}
              {...form.register("redundancy_assumption")}
            />
          </Field>
          <Field label="Technical Compliance Basis">
            <textarea
              rows={3}
              disabled={!canEditFields || pending}
              className={inputClass}
              {...form.register("technical_compliance_basis")}
            />
          </Field>
          <Field label="Customer Requirement Reference">
            <input
              disabled={!canEditFields || pending}
              className={inputClass}
              {...form.register("customer_requirement_reference")}
            />
          </Field>

          {canEditFields && (
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "กำลังบันทึก..." : mode === "create" ? "สร้างเวอร์ชัน" : "บันทึก"}
            </button>
          )}
        </form>

        {selected && selected.approval_status !== "Approved" && mode === "edit" && (
          <div className="flex flex-wrap gap-2">
            {(selected.approval_status === "Draft" ||
              selected.approval_status === "Rejected") && (
              <button
                type="button"
                disabled={pending}
                onClick={() => onStatusAction("submit")}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
              >
                ส่งตรวจสอบ (InReview)
              </button>
            )}
            {selected.approval_status === "InReview" && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onStatusAction("approve")}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  อนุมัติ (Approved)
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onStatusAction("reject")}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  ปฏิเสธ (Rejected)
                </button>
              </>
            )}
          </div>
        )}

        {selected?.approval_status === "Approved" && (
          <p className="text-sm text-neutral-600">
            เวอร์ชันนี้ถูกล็อกแล้ว — สร้างเวอร์ชันใหม่หากต้องการเปลี่ยนมูลคา assumption
          </p>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}
