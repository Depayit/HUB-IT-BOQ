import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const MODULE_LINKS = [
  { href: "lines", label: "BOQ Lines", desc: "สร้างและแก้ไขรายการ BOQ" },
  { href: "documents", label: "เอกสาร", desc: "ลิงก์เอกสารและ dependency" },
  { href: "disciplines", label: "Disciplines", desc: "เลือกสาขางานใน BOQ" },
  { href: "summary", label: "สรุปต้นทุน", desc: "BOQ Summary roll-up" },
  { href: "validation", label: "Validation", desc: "ผลตรวจสอบ BLOCK / WARNING" },
  { href: "approval", label: "อนุมัติ", desc: "Approval workflow" },
] as const;

export default async function BoqVersionPage({
  params,
}: {
  params: Promise<{ projectId: string; boqVersionId: string }>;
}) {
  const { projectId, boqVersionId } = await params;

  const version = await prisma.boq_versions.findUnique({
    where: { boq_version_id: boqVersionId },
    include: {
      project: { select: { project_name: true } },
      approval_workflows: true,
    },
  });

  if (!version || version.project_id !== projectId) notFound();

  const basePath = `/projects/${projectId}/boq/${boqVersionId}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href={`/projects/${projectId}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← กลับโปรเจกต์
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            BOQ v{version.version_no} — {version.project.project_name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            สถานะ: {version.status} · Lock: {version.lock_status}
          </p>
        </div>
        {version.approval_workflows && (
          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm">
            <p className="font-medium text-neutral-700">Approval Workflow</p>
            <p className="text-neutral-600">
              {version.approval_workflows.current_stage} (
              {version.approval_workflows.workflow_status})
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-neutral-600">เลือกโมดูล BOQ ด้านล่าง</p>

      <nav className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={`${basePath}/${item.href}`}
            className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:bg-neutral-50"
          >
            <p className="font-medium text-neutral-900">{item.label}</p>
            <p className="mt-1 text-sm text-neutral-500">{item.desc}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
