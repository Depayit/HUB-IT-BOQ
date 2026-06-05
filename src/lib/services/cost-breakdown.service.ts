import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { COST_CATEGORY_SEED } from "@/lib/constants/cost-categories";
import type { CostBreakdownPersistInput } from "@/lib/validations/cost-breakdown";
import {
  evaluateCostLineValidation,
  type CostValidationRuleCode,
} from "@/lib/validations/cost-validation";

export type CostCategoryOption = {
  cost_category_id: string;
  category_code: string;
  category_name: string;
};

export type CostBreakdownRow = {
  boq_cost_breakdown_id: string;
  boq_line_id: string;
  cost_category_id: string;
  category_code: string;
  category_name: string;
  calculation_method: string;
  base_value: number;
  rate: number;
  quantity_factor: number;
  calculated_value: number;
  cost_source: string | null;
  confidence_level: string | null;
  manual_override_flag: boolean;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type LineWithBreakdowns = {
  boq_line_id: string;
  line_no: number;
  item_description: string;
  discipline_code: string;
  is_critical_line: boolean;
  cost_layer_total: number;
  breakdowns: CostBreakdownRow[];
};

function formatBreakdown(
  row: {
    boq_cost_breakdown_id: string;
    boq_line_id: string;
    cost_category_id: string;
    calculation_method: string;
    base_value: Prisma.Decimal;
    rate: Prisma.Decimal;
    quantity_factor: Prisma.Decimal;
    calculated_value: Prisma.Decimal;
    cost_source: string | null;
    confidence_level: string | null;
    manual_override_flag: boolean;
    override_reason: string | null;
    created_at: Date;
    updated_at: Date;
    cost_category: { category_code: string; category_name: string };
  },
): CostBreakdownRow {
  return {
    boq_cost_breakdown_id: row.boq_cost_breakdown_id,
    boq_line_id: row.boq_line_id,
    cost_category_id: row.cost_category_id,
    category_code: row.cost_category.category_code,
    category_name: row.cost_category.category_name,
    calculation_method: row.calculation_method,
    base_value: row.base_value.toNumber(),
    rate: row.rate.toNumber(),
    quantity_factor: row.quantity_factor.toNumber(),
    calculated_value: row.calculated_value.toNumber(),
    cost_source: row.cost_source,
    confidence_level: row.confidence_level,
    manual_override_flag: row.manual_override_flag,
    override_reason: row.override_reason,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const breakdownInclude = {
  cost_category: { select: { category_code: true, category_name: true } },
} as const;

export const costBreakdownService = {
  async ensureCategories(): Promise<CostCategoryOption[]> {
    for (const row of COST_CATEGORY_SEED) {
      await prisma.cost_category_master.upsert({
        where: { category_code: row.category_code },
        create: {
          category_code: row.category_code,
          category_name: row.category_name,
          sort_order: row.sort_order,
          is_active: true,
        },
        update: {
          category_name: row.category_name,
          sort_order: row.sort_order,
          is_active: true,
        },
      });
    }

    const rows = await prisma.cost_category_master.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    });

    return rows.map((r) => ({
      cost_category_id: r.cost_category_id,
      category_code: r.category_code,
      category_name: r.category_name,
    }));
  },

  async listByLine(boqLineId: string): Promise<CostBreakdownRow[]> {
    const rows = await prisma.boq_cost_breakdowns.findMany({
      where: { boq_line_id: boqLineId },
      include: breakdownInclude,
      orderBy: { cost_category: { sort_order: "asc" } },
    });
    return rows.map(formatBreakdown);
  },

  async listForBoqVersion(boqVersionId: string): Promise<LineWithBreakdowns[]> {
    const lines = await prisma.boq_lines.findMany({
      where: { boq_version_id: boqVersionId },
      include: {
        project_discipline: {
          include: { discipline: { select: { discipline_code: true } } },
        },
        boq_cost_breakdowns: { include: breakdownInclude },
      },
      orderBy: { line_no: "asc" },
    });

    return lines.map((line) => {
      const breakdowns = line.boq_cost_breakdowns.map(formatBreakdown);
      const cost_layer_total = breakdowns.reduce((s, b) => s + b.calculated_value, 0);
      return {
        boq_line_id: line.boq_line_id,
        line_no: line.line_no,
        item_description: line.item_description,
        discipline_code: line.project_discipline.discipline.discipline_code,
        is_critical_line: line.is_critical_line,
        cost_layer_total,
        breakdowns,
      };
    });
  },

  async assertLineInVersion(boqLineId: string, boqVersionId: string) {
    const line = await prisma.boq_lines.findFirst({
      where: { boq_line_id: boqLineId, boq_version_id: boqVersionId },
    });
    if (!line) {
      throw new AppError("ไม่พบ BOQ line", "BOQ_LINE_NOT_FOUND", 404);
    }
    return line;
  },

  async assertNoDuplicateCategory(
    boqLineId: string,
    costCategoryId: string,
    excludeBreakdownId?: string,
  ) {
    const duplicate = await prisma.boq_cost_breakdowns.findFirst({
      where: {
        boq_line_id: boqLineId,
        cost_category_id: costCategoryId,
        ...(excludeBreakdownId
          ? { NOT: { boq_cost_breakdown_id: excludeBreakdownId } }
          : {}),
      },
    });
    if (duplicate) {
      throw new AppError(
        "Cost category ซ้ำใน line นี้ — แก้ไขรายการเดิมหรือเลือก category อื่น",
        "DUPLICATE_COST_CATEGORY",
        400,
      );
    }
  },

  async create(
    boqLineId: string,
    boqVersionId: string,
    input: CostBreakdownPersistInput,
  ): Promise<CostBreakdownRow> {
    await boqVersionService.assertEditable(boqVersionId);
    await this.assertLineInVersion(boqLineId, boqVersionId);
    await this.assertNoDuplicateCategory(boqLineId, input.cost_category_id);

    const row = await prisma.boq_cost_breakdowns.create({
      data: {
        boq_line_id: boqLineId,
        cost_category_id: input.cost_category_id,
        calculation_method: input.calculation_method,
        base_value: new Prisma.Decimal(input.base_value),
        rate: new Prisma.Decimal(input.rate),
        quantity_factor: new Prisma.Decimal(input.quantity_factor),
        calculated_value: new Prisma.Decimal(input.calculated_value),
        cost_source: input.cost_source,
        confidence_level: input.confidence_level,
        manual_override_flag: input.manual_override_flag,
        override_reason: input.override_reason,
      },
      include: breakdownInclude,
    });
    return formatBreakdown(row);
  },

  async update(
    breakdownId: string,
    boqLineId: string,
    boqVersionId: string,
    input: CostBreakdownPersistInput,
  ): Promise<CostBreakdownRow> {
    await boqVersionService.assertEditable(boqVersionId);
    await this.assertLineInVersion(boqLineId, boqVersionId);

    const existing = await prisma.boq_cost_breakdowns.findFirst({
      where: { boq_cost_breakdown_id: breakdownId, boq_line_id: boqLineId },
    });
    if (!existing) {
      throw new AppError("ไม่พบ cost breakdown", "COST_BREAKDOWN_NOT_FOUND", 404);
    }

    await this.assertNoDuplicateCategory(
      boqLineId,
      input.cost_category_id,
      breakdownId,
    );

    const row = await prisma.boq_cost_breakdowns.update({
      where: { boq_cost_breakdown_id: breakdownId },
      data: {
        cost_category_id: input.cost_category_id,
        calculation_method: input.calculation_method,
        base_value: new Prisma.Decimal(input.base_value),
        rate: new Prisma.Decimal(input.rate),
        quantity_factor: new Prisma.Decimal(input.quantity_factor),
        calculated_value: new Prisma.Decimal(input.calculated_value),
        cost_source: input.cost_source,
        confidence_level: input.confidence_level,
        manual_override_flag: input.manual_override_flag,
        override_reason: input.override_reason,
      },
      include: breakdownInclude,
    });
    return formatBreakdown(row);
  },

  async delete(breakdownId: string, boqLineId: string, boqVersionId: string) {
    await boqVersionService.assertEditable(boqVersionId);
    await this.assertLineInVersion(boqLineId, boqVersionId);

    const existing = await prisma.boq_cost_breakdowns.findFirst({
      where: { boq_cost_breakdown_id: breakdownId, boq_line_id: boqLineId },
    });
    if (!existing) {
      throw new AppError("ไม่พบ cost breakdown", "COST_BREAKDOWN_NOT_FOUND", 404);
    }

    await prisma.boq_cost_breakdowns.delete({
      where: { boq_cost_breakdown_id: breakdownId },
    });
  },

  async findLinesMissingCostLayer(boqVersionId: string) {
    return prisma.boq_lines.findMany({
      where: {
        boq_version_id: boqVersionId,
        boq_cost_breakdowns: { none: {} },
      },
      select: { boq_line_id: true, line_no: true, item_description: true },
      orderBy: { line_no: "asc" },
    });
  },

  async findCostLayerValidationFailures(
    boqVersionId: string,
  ): Promise<{ rule: CostValidationRuleCode; boq_line_id: string; message: string }[]> {
    const lines = await this.listForBoqVersion(boqVersionId);

    const failures: {
      rule: CostValidationRuleCode;
      boq_line_id: string;
      message: string;
    }[] = [];

    for (const line of lines) {
      const issues = evaluateCostLineValidation({
        boq_line_id: line.boq_line_id,
        line_no: line.line_no,
        item_description: line.item_description,
        breakdowns: line.breakdowns.map((b) => ({
          boq_cost_breakdown_id: b.boq_cost_breakdown_id,
          cost_category_id: b.cost_category_id,
          category_code: b.category_code,
          calculated_value: b.calculated_value,
          confidence_level: b.confidence_level,
          manual_override_flag: b.manual_override_flag,
          override_reason: b.override_reason,
        })),
      });

      for (const issue of issues) {
        if (issue.severity !== "BLOCK") continue;
        failures.push({
          rule: issue.rule_code,
          boq_line_id: line.boq_line_id,
          message: issue.message,
        });
      }
    }

    return failures;
  },
};
