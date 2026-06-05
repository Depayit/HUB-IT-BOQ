import { DesignBasisStatusBadge } from "@/components/boq/design-basis-status-badge";

export type DesignBasisVersionRow = {
  design_basis_version_id: string;
  project_id: string;
  design_version_no: number;
  it_load_assumption_kw: number | null;
  rack_count_assumption: number;
  rack_density_assumption: number | null;
  power_architecture: string | null;
  cooling_architecture: string | null;
  fire_protection_assumption: string | null;
  monitoring_assumption: string | null;
  redundancy_assumption: string | null;
  technical_compliance_basis: string | null;
  customer_requirement_reference: string | null;
  approval_status: "Draft" | "InReview" | "Approved" | "Rejected";
  created_at: string;
  updated_at: string;
};

export function DesignBasisVersionList({
  versions,
  selectedId,
  onSelect,
}: {
  versions: DesignBasisVersionRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-neutral-500">ยังไม่มีเวอร์ชัน — สร้างเวอร์ชันแรกด้านล่าง</p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
      {versions.map((v) => (
        <li key={v.design_basis_version_id}>
          <button
            type="button"
            onClick={() => onSelect(v.design_basis_version_id)}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-neutral-50 ${
              selectedId === v.design_basis_version_id ? "bg-blue-50" : ""
            }`}
          >
            <span className="font-medium">Design v{v.design_version_no}</span>
            <DesignBasisStatusBadge status={v.approval_status} />
          </button>
        </li>
      ))}
    </ul>
  );
}
