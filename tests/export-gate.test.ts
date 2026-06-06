import { describe, it, expect, beforeEach, vi } from "vitest";

import { AppError } from "@/lib/utils/errors";

const getReportMock = vi.fn();
const getVersionMock = vi.fn();

vi.mock("@/lib/services/boq-summary-report.service", () => ({
  boqSummaryReportService: {
    getBoqSummaryReport: (projectId: string, boqVersionId: string) =>
      getReportMock(projectId, boqVersionId),
  },
}));

vi.mock("@/lib/services/boq-version.service", () => ({
  boqVersionService: {
    getById: (boqVersionId: string) => getVersionMock(boqVersionId),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import {
  exportService,
  EXPORT_BLOCKED_CODE,
} from "@/lib/services/export.service";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const BOQ_VERSION_ID = "22222222-2222-2222-2222-222222222222";

function buildVersion() {
  return {
    boq_version_id: BOQ_VERSION_ID,
    project_id: PROJECT_ID,
    version_no: 1,
    status: "Locked",
    lock_status: "Locked",
    project: { project_name: "TD-7A-005 Test Project" },
  };
}

function buildReport(unresolvedBlocks: number) {
  return {
    summary: { boq_summary_id: "summary-1" },
    validation: {
      unresolved_blocks: unresolvedBlocks,
      ready_status: unresolvedBlocks > 0 ? "Not Ready" : "Ready",
      validation_status: unresolvedBlocks > 0 ? "Blocked" : "Pass",
      total_validation_rules: 0,
      warning_count: 0,
      block_count: unresolvedBlocks,
    },
  };
}

describe("export BLOCK gate (TD-7A-005 contract)", () => {
  beforeEach(() => {
    getReportMock.mockReset();
    getVersionMock.mockReset();
  });

  it("loadReportForExport returns ok=false with blocked=true when unresolved_blocks > 0", async () => {
    getVersionMock.mockResolvedValueOnce(buildVersion());
    getReportMock.mockResolvedValueOnce(buildReport(2));

    const loaded = await exportService.loadReportForExport(PROJECT_ID, BOQ_VERSION_ID);

    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect("blocked" in loaded && loaded.blocked).toBe(true);
      expect(loaded.error).toMatch(/2 รายการ/);
    }
  });

  it("loadReportForExport returns ok=true when unresolved_blocks = 0", async () => {
    getVersionMock.mockResolvedValueOnce(buildVersion());
    getReportMock.mockResolvedValueOnce(buildReport(0));

    const loaded = await exportService.loadReportForExport(PROJECT_ID, BOQ_VERSION_ID);

    expect(loaded.ok).toBe(true);
  });

  it("exportToExcel throws AppError(EXPORT_BLOCKED, 400) when blocked", async () => {
    getVersionMock.mockResolvedValueOnce(buildVersion());
    getReportMock.mockResolvedValueOnce(buildReport(1));

    await expect(
      exportService.exportToExcel(PROJECT_ID, BOQ_VERSION_ID),
    ).rejects.toMatchObject({
      name: "AppError",
      code: EXPORT_BLOCKED_CODE,
      status: 400,
    });
  });

  it("exportToPdf throws AppError(EXPORT_BLOCKED, 400) when blocked", async () => {
    getVersionMock.mockResolvedValueOnce(buildVersion());
    getReportMock.mockResolvedValueOnce(buildReport(3));

    let caught: unknown = null;
    try {
      await exportService.exportToPdf(PROJECT_ID, BOQ_VERSION_ID);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe(EXPORT_BLOCKED_CODE);
    expect((caught as AppError).status).toBe(400);
    expect((caught as AppError).message).toMatch(/3 รายการ/);
  });

  it("exportToExcel throws plain Error (not EXPORT_BLOCKED) on non-block failure", async () => {
    getVersionMock.mockResolvedValueOnce(null); // invalid version

    let caught: unknown = null;
    try {
      await exportService.exportToExcel(PROJECT_ID, BOQ_VERSION_ID);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(AppError);
    expect((caught as Error).message).toMatch(/Invalid BOQ version/);
  });
});

describe("export route 400 mapping (TD-7A-005 captured 400 evidence)", () => {
  it("AppError(EXPORT_BLOCKED, 400) flows to NextResponse status 400 + code EXPORT_BLOCKED", async () => {
    getVersionMock.mockResolvedValueOnce(buildVersion());
    getReportMock.mockResolvedValueOnce(buildReport(1));

    const { GET } = await import(
      "@/app/api/projects/[projectId]/boq/[boqVersionId]/export/route"
    );

    const url = `http://localhost/api/projects/${PROJECT_ID}/boq/${BOQ_VERSION_ID}/export?format=xlsx`;
    const res = await GET(new Request(url), {
      params: Promise.resolve({
        projectId: PROJECT_ID,
        boqVersionId: BOQ_VERSION_ID,
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; code?: string };
    expect(body.code).toBe(EXPORT_BLOCKED_CODE);
    expect(body.error).toMatch(/ถูกบล็อก/);
  });
});
