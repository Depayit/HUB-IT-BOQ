import {
  validation_result_status,
  validation_severity,
  type validation_results,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { boqLineService } from "@/lib/services/boq-line.service";
import { auditService } from "@/lib/services/audit.service";
import { documentService } from "@/lib/services/document.service";
import { disciplineService } from "@/lib/services/discipline.service";
import { costBreakdownService } from "@/lib/services/cost-breakdown.service";
import {
  evaluateDesignBasisApproval,
  evaluateHandoffLock,
} from "@/lib/validations/workflow";
import {
  APPROVAL_BLOCK_RULES,
  HANDOFF_BLOCK_RULES,
  VALIDATION_RULE_CODES,
  VALIDATION_RULE_DEFINITIONS,
  projectRequiresSld,
  type ValidationRuleCode,
} from "@/lib/validations/validation-rules";

export type ValidationResultRow = {
  validation_result_id: string;
  rule_code: string;
  rule_group: string;
  severity: validation_severity;
  target_object_type: string;
  target_object_id: string | null;
  message: string;
  result_status: validation_result_status;
  override_reason: string | null;
  resolved_flag: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  rule_template_message: string;
};

export type WorkflowGate = {
  unresolved_block_count: number;
  unresolved_approval_block_count: number;
  unresolved_handoff_block_count: number;
  can_approve: boolean;
  can_handoff: boolean;
  block_reason: string | null;
  handoff_block_reason: string | null;
};

type ValidationResultGateRow = Pick<
  validation_results,
  "severity" | "resolved_flag" | "result_status" | "rule_code"
>;

export function isUnresolvedBlock(
  row: Pick<validation_results, "severity" | "resolved_flag" | "result_status">,
): boolean {
  return (
    row.severity === "BLOCK" &&
    !row.resolved_flag &&
    row.result_status !== "Pass" &&
    row.result_status !== "Overridden"
  );
}

function isUnresolvedBlockForRules(
  row: ValidationResultGateRow,
  rules: readonly ValidationRuleCode[],
): boolean {
  return isUnresolvedBlock(row) && rules.includes(row.rule_code as ValidationRuleCode);
}

function formatResult(
  row: validation_results & {
    validation_rule: { message: string };
  },
): ValidationResultRow {
  return {
    validation_result_id: row.validation_result_id,
    rule_code: row.rule_code,
    rule_group: row.rule_group,
    severity: row.severity,
    target_object_type: row.target_object_type,
    target_object_id: row.target_object_id,
    message: row.message,
    result_status: row.result_status,
    override_reason: row.override_reason,
    resolved_flag: row.resolved_flag,
    resolved_by: row.resolved_by,
    resolved_at: row.resolved_at?.toISOString() ?? null,
    rule_template_message: row.validation_rule.message,
  };
}

type FailureEntry = {
  rule_code: ValidationRuleCode;
  target_object_type: string;
  target_object_id: string | null;
  message: string;
  result_status: validation_result_status;
};

export const validationService = {
  async listResultsWithRules(boqVersionId: string): Promise<ValidationResultRow[]> {
    const rows = await prisma.validation_results.findMany({
      where: { boq_version_id: boqVersionId },
      include: { validation_rule: true },
      orderBy: [
        { severity: "asc" },
        { rule_group: "asc" },
        { rule_code: "asc" },
        { created_at: "desc" },
      ],
    });
    return rows.map(formatResult);
  },

  async countUnresolvedBlocks(boqVersionId: string): Promise<number> {
    const rows = await prisma.validation_results.findMany({
      where: { boq_version_id: boqVersionId },
      select: { severity: true, resolved_flag: true, result_status: true },
    });
    return rows.filter(isUnresolvedBlock).length;
  },

  async getWorkflowGate(boqVersionId: string): Promise<WorkflowGate> {
    const rows = await prisma.validation_results.findMany({
      where: { boq_version_id: boqVersionId },
      select: {
        severity: true,
        resolved_flag: true,
        result_status: true,
        rule_code: true,
      },
    });

    const unresolved_approval_block_count = rows.filter((row) =>
      isUnresolvedBlockForRules(row, APPROVAL_BLOCK_RULES),
    ).length;
    const unresolved_handoff_block_count = rows.filter((row) =>
      isUnresolvedBlockForRules(row, HANDOFF_BLOCK_RULES),
    ).length;
    const unresolved_block_count = rows.filter(isUnresolvedBlock).length;

    const approvalBlocked = unresolved_approval_block_count > 0;
    const handoffBlocked = unresolved_handoff_block_count > 0;

    return {
      unresolved_block_count,
      unresolved_approval_block_count,
      unresolved_handoff_block_count,
      can_approve: !approvalBlocked,
      can_handoff: !handoffBlocked,
      block_reason: approvalBlocked
        ? `มี unresolved BLOCK (approval) ${unresolved_approval_block_count} รายการ — ต้องแก้ไขหรือ resolve ก่อนอนุมัติ`
        : null,
      handoff_block_reason: handoffBlocked
        ? `มี unresolved BLOCK (handoff) ${unresolved_handoff_block_count} รายการ — ต้องแก้ไขหรือ resolve ก่อน handoff`
        : null,
    };
  },

  async assertNoUnresolvedBlocks(boqVersionId: string) {
    const gate = await this.getWorkflowGate(boqVersionId);
    if (!gate.can_approve) {
      throw new AppError(
        gate.block_reason ?? "Validation BLOCK — ไม่สามารถดำเนินการอนุมัติได้",
        "VALIDATION_BLOCK",
        403,
      );
    }
  },

  async assertNoUnresolvedHandoffBlocks(boqVersionId: string) {
    const gate = await this.getWorkflowGate(boqVersionId);
    if (!gate.can_handoff) {
      throw new AppError(
        gate.handoff_block_reason ?? "Validation BLOCK — ไม่สามารถ handoff ได้",
        "VALIDATION_BLOCK",
        403,
      );
    }
  },

  async ensureRule(ruleCode: ValidationRuleCode) {
    let rule = await prisma.validation_rules.findUnique({
      where: { rule_code: ruleCode },
    });
    if (rule) return rule;

    const def = VALIDATION_RULE_DEFINITIONS[ruleCode];
    rule = await prisma.validation_rules.create({
      data: { rule_code: ruleCode, ...def, is_active: true },
    });
    return rule;
  },

  /** Re-run engine checks and refresh validation_results for this BOQ version. */
  async runValidation(boqVersionId: string) {
    const version = await prisma.boq_versions.findUnique({
      where: { boq_version_id: boqVersionId },
      select: {
        boq_version_id: true,
        project_id: true,
        lock_status: true,
        project: { select: { project_type: true } },
      },
    });
    if (!version) {
      throw new AppError("ไม่พบ BOQ Version", "BOQ_VERSION_NOT_FOUND", 404);
    }

    const rules = await Promise.all(
      VALIDATION_RULE_CODES.map((code) => this.ensureRule(code)),
    );

    const [
      criticalFailures,
      missingDocs,
      disciplinesWithoutLines,
      costLayerFailures,
      latestDesignBasis,
    ] = await Promise.all([
      boqLineService.findCriticalLineValidationFailures(boqVersionId),
      documentService.findMissingRequiredDocs(version.project_id, boqVersionId),
      disciplineService.findIncludedWithoutLines(boqVersionId),
      costBreakdownService.findCostLayerValidationFailures(boqVersionId),
      prisma.design_basis_versions.findFirst({
        where: { project_id: version.project_id },
        orderBy: { design_version_no: "desc" },
        select: {
          design_basis_version_id: true,
          design_version_no: true,
          approval_status: true,
        },
      }),
    ]);

    const requiresSld = projectRequiresSld(version.project.project_type);
    const failures: FailureEntry[] = [];

    for (const line of criticalFailures) {
      failures.push({
        rule_code: "CRITICAL_LINE_ZERO_COST",
        target_object_type: "boq_line",
        target_object_id: line.boq_line_id,
        message: `Line ${line.line_no}: ${line.validation.message ?? "Critical line zero cost"}`,
        result_status: "Fail",
      });
    }

    for (const doc of missingDocs) {
      if (doc.rule === "DOC_SLD_REQUIRED" && !requiresSld) continue;
      failures.push({
        rule_code: doc.rule as ValidationRuleCode,
        target_object_type: "document",
        target_object_id: null,
        message: doc.message,
        result_status: "Fail",
      });
    }

    for (const disc of disciplinesWithoutLines) {
      failures.push({
        rule_code: "DISCIPLINE_NO_LINES",
        target_object_type: "project_discipline",
        target_object_id: disc.project_discipline_id,
        message: `${disc.discipline.discipline_code} (${disc.discipline.discipline_name}): discipline ที่ include ต้องมี BOQ line อย่างน้อย 1 รายการ`,
        result_status: "Fail",
      });
    }

    for (const costFailure of costLayerFailures) {
      failures.push({
        rule_code: costFailure.rule,
        target_object_type: "boq_line",
        target_object_id: costFailure.boq_line_id,
        message: costFailure.message,
        result_status: "Fail",
      });
    }

    const designCheck = evaluateDesignBasisApproval(latestDesignBasis?.approval_status);
    if (!designCheck.passes) {
      failures.push({
        rule_code: "DESIGN_BASIS_NOT_APPROVED",
        target_object_type: "design_basis_version",
        target_object_id: latestDesignBasis?.design_basis_version_id ?? null,
        message:
          latestDesignBasis != null
            ? `Design Basis v${latestDesignBasis.design_version_no}: ${designCheck.message ?? VALIDATION_RULE_DEFINITIONS.DESIGN_BASIS_NOT_APPROVED.message}`
            : (designCheck.message ?? VALIDATION_RULE_DEFINITIONS.DESIGN_BASIS_NOT_APPROVED.message),
        result_status: "Fail",
      });
    }

    const lockCheck = evaluateHandoffLock(version.lock_status);
    if (!lockCheck.passes) {
      failures.push({
        rule_code: "HANDOFF_WITHOUT_LOCK",
        target_object_type: "boq_version",
        target_object_id: version.boq_version_id,
        message: lockCheck.message ?? VALIDATION_RULE_DEFINITIONS.HANDOFF_WITHOUT_LOCK.message,
        result_status: "Fail",
      });
    }

    const ruleMap = Object.fromEntries(rules.map((r) => [r.rule_code, r]));

    await prisma.$transaction(async (tx) => {
      await tx.validation_results.deleteMany({
        where: {
          boq_version_id: boqVersionId,
          rule_code: { in: [...VALIDATION_RULE_CODES] },
        },
      });

      if (failures.length === 0) return;

      await tx.validation_results.createMany({
        data: failures.map((f) => {
          const rule = ruleMap[f.rule_code];
          return {
            boq_version_id: boqVersionId,
            validation_rule_id: rule.validation_rule_id,
            rule_code: rule.rule_code,
            rule_group: rule.rule_group,
            severity: rule.severity,
            target_object_type: f.target_object_type,
            target_object_id: f.target_object_id,
            message: f.message,
            result_status: f.result_status,
            resolved_flag: false,
          };
        }),
      });
    });

    await auditService.append({
      object_type: "boq_version",
      object_id: boqVersionId,
      action_type: "update",
      new_value: `validation_run: ${failures.length} findings`,
      changed_by: "system",
      change_reason: "Validation Engine re-run",
    });

    return this.listResultsWithRules(boqVersionId);
  },

  async resolveResult(
    validationResultId: string,
    boqVersionId: string,
    resolvedBy: string,
  ) {
    const row = await prisma.validation_results.findUnique({
      where: { validation_result_id: validationResultId },
    });
    if (!row || row.boq_version_id !== boqVersionId) {
      throw new AppError("ไม่พบ validation result", "VALIDATION_NOT_FOUND", 404);
    }

    await prisma.validation_results.update({
      where: { validation_result_id: validationResultId },
      data: {
        resolved_flag: true,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
        result_status: "Pass",
      },
    });
  },

  async overrideResult(
    validationResultId: string,
    boqVersionId: string,
    overrideReason: string,
    resolvedBy: string,
  ) {
    const row = await prisma.validation_results.findUnique({
      where: { validation_result_id: validationResultId },
    });
    if (!row || row.boq_version_id !== boqVersionId) {
      throw new AppError("ไม่พบ validation result", "VALIDATION_NOT_FOUND", 404);
    }
    if (row.severity !== "BLOCK") {
      throw new AppError("Override ใช้ได้เฉพาะ BLOCK severity", "INVALID_OVERRIDE", 400);
    }

    await prisma.validation_results.update({
      where: { validation_result_id: validationResultId },
      data: {
        result_status: "Overridden",
        override_reason: overrideReason.trim(),
        resolved_flag: true,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
      },
    });
  },
};
