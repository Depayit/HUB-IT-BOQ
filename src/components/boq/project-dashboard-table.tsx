import Link from "next/link";
import { StatusBadge } from "@/components/boq/status-badge";
import type { ProjectDashboardStatus } from "@/lib/services/project.service";

export type ProjectRow = {
  project_id: string;
  project_name: string;
  location: string | null;
  project_type: string | null;
  it_load_kw: number | null;
  rack_count: number;
  rack_density_kw_per_rack: number | null;
  project_status: string;
  currency: string;
  dashboard: ProjectDashboardStatus;
  latest_boq_version_no: number | null;
};

export function ProjectDashboardTable({ projects }: { projects: ProjectRow[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
        ยังไม่มีโปรเจกต์ — กด &quot;สร้างโปรเจกต์&quot; เพื่อเริ่มต้น
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">โปรเจกต์</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">สถานที่</th>
            <th className="px-4 py-3 text-right font-medium text-neutral-600">IT Load (kW)</th>
            <th className="px-4 py-3 text-right font-medium text-neutral-600">Racks</th>
            <th className="px-4 py-3 text-right font-medium text-neutral-600">Density (kW/rack)</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">สถานะโปรเจกต์</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">BOQ / Dashboard</th>
            <th className="px-4 py-3 text-right font-medium text-neutral-600">BOQ Ver.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {projects.map((p) => (
            <tr key={p.project_id} className="hover:bg-neutral-50">
              <td className="px-4 py-3">
                <Link
                  href={`/projects/${p.project_id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {p.project_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{p.location ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{p.it_load_kw ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{p.rack_count}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {p.rack_density_kw_per_rack != null
                  ? p.rack_density_kw_per_rack.toFixed(2)
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <span className="text-neutral-700">{p.project_status}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge label={p.dashboard.label} variant={p.dashboard.variant} />
              </td>
              <td className="px-4 py-3 text-right text-neutral-600">
                {p.latest_boq_version_no ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
