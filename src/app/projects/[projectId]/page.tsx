import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/boq/project-form";
import { StatusBadge } from "@/components/boq/status-badge";
import { DesignBasisStatusBadge } from "@/components/boq/design-basis-status-badge";
import { getProject } from "@/lib/actions/project.actions";
import { getDesignBasisApprovalGate } from "@/lib/services/design-basis-guard";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [result, designGate] = await Promise.all([
    getProject(projectId),
    getDesignBasisApprovalGate(projectId),
  ]);

  if (!result.ok) {
    if (result.error === "ไม่พบโปรเจกต์") notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const p = result.project;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/projects" className="text-sm text-blue-600 hover:underline">
        ← กลับ Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{p.project_name}</h1>
          <p className="mt-1 text-sm text-neutral-500">ID: {p.project_id}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge label={p.dashboard.label} variant={p.dashboard.variant} />
          <span className="text-xs text-neutral-500">
            โปรเจกต์: {p.project_status}
            {p.dashboard.lock_status && ` · Lock: ${p.dashboard.lock_status}`}
          </span>
        </div>
      </div>

      <section className="mt-8 grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="IT Load (kW)" value={String(p.it_load_kw ?? "—")} />
        <Stat label="Rack Count" value={String(p.rack_count)} />
        <Stat
          label="Rack Density (kW/rack)"
          value={
            p.rack_density_kw_per_rack != null
              ? p.rack_density_kw_per_rack.toFixed(4)
              : "—"
          }
        />
        <Stat
          label="BOQ Version ล่าสุด"
          value={
            p.boq_versions[0]
              ? `v${p.boq_versions[0].version_no} (${p.boq_versions[0].status})`
              : "—"
          }
        />
      </section>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-neutral-700">Design Basis</p>
          <p className="mt-1 text-xs text-neutral-500">{designGate.message}</p>
          {designGate.latest && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm">v{designGate.latest.design_version_no}</span>
              <DesignBasisStatusBadge status={designGate.latest.approval_status} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${projectId}/design-basis`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Design Basis →
          </Link>
          <Link
            href={`/projects/${projectId}/training`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Training Records →
          </Link>
        </div>
      </section>

      {!designGate.can_approve_boq && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          การอนุมัติ BOQ ถูกบล็อกจนกว่า Design Basis ล่าสุดจะเป็น Approved
        </p>
      )}

      {p.dashboard.unresolved_blocks > 0 && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          มี Validation BLOCK ที่ยังไม่แก้: {p.dashboard.unresolved_blocks} รายการ
        </p>
      )}

      {p.boq_versions[0] && (
        <div className="mt-6">
          <Link
            href={`/projects/${projectId}/boq/${p.boq_versions[0].boq_version_id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            เปิด BOQ Version ล่าสุด →
          </Link>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">แก้ไขโปรเจกต์</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Rack Density คำนวณฝั่งเซิร์ฟเวอร์เมื่อบันทึก (ไม่รับค่าจากฟอร์ม)
        </p>
        <div className="mt-6">
          <ProjectForm
            mode="edit"
            projectId={projectId}
            defaultValues={{
              client_id: p.client_id,
              opportunity_id: p.opportunity_id,
              project_name: p.project_name,
              location: p.location,
              project_type: p.project_type,
              it_load_kw: p.it_load_kw ?? undefined,
              rack_count: p.rack_count,
              tier_target: p.tier_target,
              sla_target: p.sla_target,
              currency: p.currency,
              vat_option: p.vat_option,
              project_status: p.project_status as "Active" | "OnHold" | "Archived",
            }}
          />
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
