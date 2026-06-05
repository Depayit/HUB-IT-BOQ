import { describe, it, expect, vi, beforeEach } from "vitest";
import { isReportExportBlocked } from "@/lib/validations/reporting";

vi.mock("@/lib/services/boq-version.service", () => ({
  boqVersionService: {
    getById: vi.fn(async () => ({
      project_id: "p1",
      version_no: 1,
      status: "Locked",
      lock_status: "Locked",
      project: { project_name: "DC-A", currency: "THB" },
    })),
  },
}));

const getReport = vi.fn();
vi.mock("@/lib/services/boq-summary-report.service", () => ({
  boqSummaryReportService: {
    getBoqSummaryReport: (...a: unknown[]) => getReport(...a),
  },
}));

import { exportService } from "@/lib/services/export.service";

const blockedReport = {
  summary: { subtotal_before_margin: 100 },
  validation: { unresolved_blocks: 2, ready_status: "Blocked" },
};
const cleanReport = {
  summary: { subtotal_before_margin: 100 },
  validation: { unresolved_blocks: 0, ready_status: "Ready" },
};

beforeEach(() => {
  getReport.mockReset();
});

describe("export BLOCK gate (-> 400)", () => {
  it("SSOT predicate blocks only when unresolved blocks exist", () => {
    expect(isReportExportBlocked(0)).toBe(false);
    expect(isReportExportBlocked(2)).toBe(true);
  });

  it("loadReportForExport returns ok:false when unresolved blocks exist", async () => {
    getReport.mockResolvedValue(blockedReport);
    const r = await exportService.loadReportForExport("p1", "v1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Export ถูกบล็อก");
  });

  it("exportToExcel throws when blocked (route maps this to HTTP 400)", async () => {
    getReport.mockResolvedValue(blockedReport);
    await expect(exportService.exportToExcel("p1", "v1")).rejects.toThrow(/ถูกบล็อก/);
  });

  it("loadReportForExport returns ok:true when no unresolved blocks", async () => {
    getReport.mockResolvedValue(cleanReport);
    const r = await exportService.loadReportForExport("p1", "v1");
    expect(r.ok).toBe(true);
  });
});
