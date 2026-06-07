import { describe, it, expect } from "vitest";

import {
  GOV_REPORTING_RULE_CODES,
  GOV_TO_REPORT,
  REPORT_TO_GOV,
  REPORT_VALIDATION_CODES,
  isReportExportBlocked,
  validateValidationSummary,
} from "@/lib/validations/reporting";
import {
  buildReportingGovernanceMetadata,
  evaluateReportingGovernanceWarnings,
  REPORTING_GOVERNANCE_WARNING_CODES,
} from "@/lib/validations/reporting-governance";
import {
  deriveReadinessTier,
  isForwardableTier,
} from "@/lib/validations/readiness";
import {
  aggregateWarningFindings,
  collectReportingGovernanceWarnings,
  countOpenWarnings,
  toPersistableFinding,
} from "@/lib/validations/validation-findings";
import { isUnresolvedBlock } from "@/lib/services/validation.service";
import {
  resultStatusForRule,
  VALIDATION_RULE_DEFINITIONS,
} from "@/lib/validations/validation-rules";

describe("reporting governance WARNING rules (S7B-2B)", () => {
  it("missing revision governance metadata emits GOV_REVISION_NUMBER WARNING", () => {
    const findings = evaluateReportingGovernanceWarnings({
      revision_number: null,
      readiness_governance_marker: "Ready",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule_code).toBe("GOV_REVISION_NUMBER");
    expect(findings[0]?.severity).toBe("WARNING");
  });

  it("missing readiness governance metadata emits GOV_READINESS_STATUS WARNING", () => {
    const findings = evaluateReportingGovernanceWarnings({
      revision_number: 1,
      readiness_governance_marker: null,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule_code).toBe("GOV_READINESS_STATUS");
    expect(findings[0]?.severity).toBe("WARNING");
  });

  it("missing both governance metadata fields emits 2 WARNINGs", () => {
    const findings = evaluateReportingGovernanceWarnings({
      revision_number: null,
      readiness_governance_marker: "",
    });
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.rule_code).sort()).toEqual([
      "GOV_READINESS_STATUS",
      "GOV_REVISION_NUMBER",
    ]);
  });

  it("complete governance metadata emits no warnings when content is complete", () => {
    const metadata = buildReportingGovernanceMetadata({
      version_no: 1,
      readiness_governance_marker: "Ready",
    });
    const findings = evaluateReportingGovernanceWarnings(metadata, {
      contentComplete: true,
    });
    expect(findings).toHaveLength(0);
  });

  it("does not emit governance warnings when report content is not complete", () => {
    const findings = evaluateReportingGovernanceWarnings(
      { revision_number: null, readiness_governance_marker: null },
      { contentComplete: false },
    );
    expect(findings).toHaveLength(0);
  });

  it("buildReportingGovernanceMetadata applies overrides for SIM-008 hook", () => {
    const metadata = buildReportingGovernanceMetadata({
      version_no: 1,
      readiness_governance_marker: "Ready",
      overrides: { revision_number: null, readiness_governance_marker: null },
    });
    expect(metadata.revision_number).toBeNull();
    expect(metadata.readiness_governance_marker).toBeNull();
  });

  it("warning-only reporting governance does not create unresolved BLOCK", () => {
    const persisted = collectReportingGovernanceWarnings({
      revision_number: null,
      readiness_governance_marker: "Ready",
    }).map((f) => toPersistableFinding(f));

    const rows = persisted.map((f) => ({
      severity: f.severity,
      resolved_flag: false,
      result_status: f.result_status,
    }));
    expect(rows.filter(isUnresolvedBlock)).toHaveLength(0);
    expect(resultStatusForRule("GOV_REVISION_NUMBER")).toBe("Warning");
  });

  it("warning-only reporting governance derives readiness = Warning", () => {
    const findings = aggregateWarningFindings({
      costLines: [],
      disciplines: [],
      reportingGovernance: {
        revision_number: null,
        readiness_governance_marker: "Ready",
      },
    });
    const rows = findings.map((f) => ({
      severity: f.severity,
      resolved_flag: false,
      result_status: f.result_status,
    }));
    const open_warning_count = countOpenWarnings(rows);

    expect(open_warning_count).toBe(1);
    expect(
      deriveReadinessTier({
        validation_run: true,
        unresolved_block_count: 0,
        open_warning_count,
        can_approve: true,
      }),
    ).toBe("Warning");
  });

  it("export is allowed with governance WARNING and 0 BLOCK", () => {
    const tier = deriveReadinessTier({
      validation_run: true,
      unresolved_block_count: 0,
      open_warning_count: 2,
      can_approve: true,
    });
    expect(tier).toBe("Warning");
    expect(isForwardableTier(tier)).toBe(true);
    expect(isReportExportBlocked(0)).toBe(false);
  });

  it("export is still blocked when existing reporting BLOCK exists", () => {
    const blockIssue = validateValidationSummary({
      results: [],
      unresolved_block_count: 2,
      validation_run: true,
    });
    expect(blockIssue?.code).toBe("REPORT_VALIDATION_INCOMPLETE");
    expect(isReportExportBlocked(2)).toBe(true);
  });

  it("existing GOV_REPORT_* / REPORT_* block alias still passes bijection", () => {
    expect(GOV_REPORTING_RULE_CODES).toHaveLength(6);
    for (const code of REPORT_VALIDATION_CODES) {
      expect(GOV_TO_REPORT[REPORT_TO_GOV[code]]).toBe(code);
    }
  });

  it("registers governance warning codes as WARNING severity in SSOT", () => {
    for (const code of REPORTING_GOVERNANCE_WARNING_CODES) {
      expect(VALIDATION_RULE_DEFINITIONS[code].severity).toBe("WARNING");
      expect(resultStatusForRule(code)).toBe("Warning");
    }
  });
});
