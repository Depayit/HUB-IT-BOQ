import { describe, it, expect } from "vitest";
import {
  REPORT_VALIDATION_CODES,
  GOV_REPORTING_RULE_CODES,
  REPORT_TO_GOV,
  toGovCode,
  isReportExportBlocked,
} from "@/lib/validations/reporting";

describe("reporting governance (GOV_*) SSOT", () => {
  it("maps every REPORT_* code to a GOV_* code", () => {
    for (const code of REPORT_VALIDATION_CODES) {
      const gov = toGovCode(code);
      expect(gov.startsWith("GOV_")).toBe(true);
      expect(GOV_REPORTING_RULE_CODES).toContain(gov);
    }
  });

  it("GOV mapping is 1:1 and complete", () => {
    const govValues = Object.values(REPORT_TO_GOV);
    expect(new Set(govValues).size).toBe(REPORT_VALIDATION_CODES.length);
    expect(GOV_REPORTING_RULE_CODES.length).toBe(REPORT_VALIDATION_CODES.length);
  });

  it("export is blocked only when unresolved blocks exist", () => {
    expect(isReportExportBlocked(0)).toBe(false);
    expect(isReportExportBlocked(1)).toBe(true);
    expect(isReportExportBlocked(5)).toBe(true);
  });
});
