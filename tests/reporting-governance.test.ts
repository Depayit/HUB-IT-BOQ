import { describe, it, expect } from "vitest";

import {
  GOV_REPORTING_RULE_CODES,
  GOV_TO_REPORT,
  REPORT_TO_GOV,
  REPORT_VALIDATION_CODES,
  isReportExportBlocked,
  toGovCode,
  toReportCode,
  type GovReportingRuleCode,
  type ReportValidationCode,
} from "@/lib/validations/reporting";

describe("Reporting Governance SSOT (TD-7A-011)", () => {
  it("declares all 6 GOV_* codes in canonical order", () => {
    expect(GOV_REPORTING_RULE_CODES).toEqual([
      "GOV_REPORT_PROJECT",
      "GOV_REPORT_DOCUMENT",
      "GOV_REPORT_DISCIPLINE",
      "GOV_REPORT_COST",
      "GOV_REPORT_VALIDATION",
      "GOV_REPORT_EXPORT",
    ]);
  });

  it("REPORT_TO_GOV covers every REPORT_* engine code (no missing keys)", () => {
    for (const code of REPORT_VALIDATION_CODES) {
      const govCode = REPORT_TO_GOV[code];
      expect(govCode).toBeDefined();
      expect(GOV_REPORTING_RULE_CODES).toContain(govCode);
    }
    expect(Object.keys(REPORT_TO_GOV)).toHaveLength(REPORT_VALIDATION_CODES.length);
  });

  it("GOV_TO_REPORT covers every GOV_* code (reverse coverage)", () => {
    for (const code of GOV_REPORTING_RULE_CODES) {
      const reportCode = GOV_TO_REPORT[code];
      expect(reportCode).toBeDefined();
      expect(REPORT_VALIDATION_CODES).toContain(reportCode);
    }
    expect(Object.keys(GOV_TO_REPORT)).toHaveLength(GOV_REPORTING_RULE_CODES.length);
  });

  it("REPORT_TO_GOV and GOV_TO_REPORT are bijective inverses", () => {
    for (const reportCode of REPORT_VALIDATION_CODES) {
      const gov = REPORT_TO_GOV[reportCode];
      const back = GOV_TO_REPORT[gov];
      expect(back).toBe(reportCode);
    }
    for (const govCode of GOV_REPORTING_RULE_CODES) {
      const report = GOV_TO_REPORT[govCode];
      const back = REPORT_TO_GOV[report];
      expect(back).toBe(govCode);
    }
  });

  it("toGovCode helper matches the SSOT mapping", () => {
    for (const code of REPORT_VALIDATION_CODES) {
      expect(toGovCode(code)).toBe(REPORT_TO_GOV[code]);
    }
  });

  it("toReportCode helper matches the SSOT mapping", () => {
    for (const code of GOV_REPORTING_RULE_CODES) {
      expect(toReportCode(code)).toBe(GOV_TO_REPORT[code]);
    }
  });

  it("type compatibility — GovReportingRuleCode and ReportValidationCode round-trip", () => {
    const sample: ReportValidationCode = "REPORT_DISCIPLINE_INCOMPLETE";
    const gov: GovReportingRuleCode = toGovCode(sample);
    expect(gov).toBe("GOV_REPORT_DISCIPLINE");
    expect(toReportCode(gov)).toBe(sample);
  });
});

describe("Export BLOCK gate predicate (SSOT) — TD-7A-011 + TD-7A-005 alignment", () => {
  it("isReportExportBlocked returns true when unresolved_block_count > 0", () => {
    expect(isReportExportBlocked(1)).toBe(true);
    expect(isReportExportBlocked(5)).toBe(true);
    expect(isReportExportBlocked(100)).toBe(true);
  });

  it("isReportExportBlocked returns false when unresolved_block_count = 0", () => {
    expect(isReportExportBlocked(0)).toBe(false);
  });

  it("predicate is the single source the export service uses (no duplicate gate logic)", async () => {
    const exportSvcSrc = await import("fs/promises").then((fs) =>
      fs.readFile("src/lib/services/export.service.ts", "utf8"),
    );
    expect(exportSvcSrc).toContain("isReportExportBlocked(");
    expect(exportSvcSrc).toMatch(
      /import\s*\{\s*isReportExportBlocked\s*\}\s*from\s*"@\/lib\/validations\/reporting"/,
    );
  });
});
