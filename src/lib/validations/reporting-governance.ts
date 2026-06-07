/**
 * Reporting Governance WARNING rules (S7B-2B).
 *
 * Evaluates export/report governance metadata completeness separately from
 * REPORT_* content BLOCK rules. Missing governance metadata emits WARNING —
 * never BLOCK — so export remains allowed when unresolved_block_count = 0.
 */
import type { validation_severity } from "@prisma/client";

import {
  VALIDATION_RULE_DEFINITIONS,
  type ValidationRuleCode,
} from "@/lib/validations/validation-rules";

export const REPORTING_GOVERNANCE_WARNING_CODES = [
  "GOV_REVISION_NUMBER",
  "GOV_READINESS_STATUS",
] as const;

export type ReportingGovernanceWarningCode =
  (typeof REPORTING_GOVERNANCE_WARNING_CODES)[number];

export type ReportingGovernanceMetadata = {
  /** Canonical revision reference — maps to report.project.boq_version_no */
  revision_number: number | null;
  /** Canonical readiness governance marker — maps to export snapshot ready_status */
  readiness_governance_marker: string | null;
};

export type ReportingGovernanceFinding = {
  rule_code: ReportingGovernanceWarningCode;
  target_object_type: string;
  target_object_id: string | null;
  message: string;
  severity: validation_severity;
};

export function buildReportingGovernanceMetadata(input: {
  version_no: number;
  readiness_governance_marker: string | null;
  overrides?: Partial<ReportingGovernanceMetadata>;
}): ReportingGovernanceMetadata {
  const base: ReportingGovernanceMetadata = {
    revision_number: input.version_no,
    readiness_governance_marker: input.readiness_governance_marker,
  };
  if (!input.overrides) return base;
  return {
    revision_number:
      input.overrides.revision_number !== undefined
        ? input.overrides.revision_number
        : base.revision_number,
    readiness_governance_marker:
      input.overrides.readiness_governance_marker !== undefined
        ? input.overrides.readiness_governance_marker
        : base.readiness_governance_marker,
  };
}

function isRevisionGovernanceMissing(metadata: ReportingGovernanceMetadata): boolean {
  return metadata.revision_number == null || metadata.revision_number <= 0;
}

function isReadinessGovernanceMissing(metadata: ReportingGovernanceMetadata): boolean {
  const marker = metadata.readiness_governance_marker;
  return marker == null || String(marker).trim() === "";
}

export function evaluateReportingGovernanceWarnings(
  metadata: ReportingGovernanceMetadata,
  options?: { contentComplete?: boolean },
): ReportingGovernanceFinding[] {
  if (options?.contentComplete === false) return [];

  const findings: ReportingGovernanceFinding[] = [];

  if (isRevisionGovernanceMissing(metadata)) {
    const def = VALIDATION_RULE_DEFINITIONS.GOV_REVISION_NUMBER;
    findings.push({
      rule_code: "GOV_REVISION_NUMBER",
      target_object_type: def.target_object_type,
      target_object_id: null,
      message: def.message,
      severity: "WARNING",
    });
  }

  if (isReadinessGovernanceMissing(metadata)) {
    const def = VALIDATION_RULE_DEFINITIONS.GOV_READINESS_STATUS;
    findings.push({
      rule_code: "GOV_READINESS_STATUS",
      target_object_type: def.target_object_type,
      target_object_id: null,
      message: def.message,
      severity: "WARNING",
    });
  }

  return findings;
}

/** Type guard — governance warning codes are a subset of ValidationRuleCode. */
export function isReportingGovernanceWarningCode(
  code: string,
): code is ReportingGovernanceWarningCode {
  return (REPORTING_GOVERNANCE_WARNING_CODES as readonly string[]).includes(code);
}

export type { ValidationRuleCode };
