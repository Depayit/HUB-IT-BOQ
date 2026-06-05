import Link from "next/link";
import { ProjectDashboardTable } from "@/components/boq/project-dashboard-table";
import { getProjectsDashboard } from "@/lib/actions/project.actions";

export const dynamic = "force-dynamic";

export default async function ProjectsDashboardPage() {
  const result = await getProjectsDashboard();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            สถานะ BOQ อนุมัติจาก BOQ version ล่าสุด, validation BLOCK, approval workflow และ lock
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + สร้างโปรเจกต์
        </Link>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">ไม่สามารถโหลดข้อมูลได้</p>
          <p className="mt-1">{result.error}</p>
          <p className="mt-2 text-xs text-red-700">
            ตรวจสอบ DATABASE_URL ใน .env และรัน npm run db:migrate
          </p>
        </div>
      ) : (
        <ProjectDashboardTable projects={result.projects} />
      )}
    </main>
  );
}
