import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  COST_CATEGORY_TO_SUMMARY_FIELD,
  DEFAULT_MARGIN_PERCENT,
  type SummaryCostField,
} from "@/lib/constants/cost-categories";
import { decimalToNumber, sumDecimals } from "@/lib/utils/decimal";
import { boqVersionService } from "@/lib/services/boq-version.service";

export type CategoryTotals = Record<SummaryCostField, Prisma.Decimal>;

export type BoqSummaryView = {
  boq_summary_id: string;
  boq_version_id: string;
  total_material_cost: number;
  total_labor_cost: number;
  total_logistics_cost: number;
  total_testing_cost: number;
  total_documentation_cost: number;
  total_indirect_cost: number;
  total_risk_cost: number;
  total_overhead_cost: number;
  subtotal_before_margin: number;
  margin_percent: number;
  selling_price: number;
  gross_profit: number;
  gross_margin_percent: number;
  breakdown_line_count: number;
  updated_at: string;
};

function emptyCategoryTotals(): CategoryTotals {
  return {
    total_material_cost: new Prisma.Decimal(0),
    total_labor_cost: new Prisma.Decimal(0),
    total_logistics_cost: new Prisma.Decimal(0),
    total_testing_cost: new Prisma.Decimal(0),
    total_documentation_cost: new Prisma.Decimal(0),
    total_indirect_cost: new Prisma.Decimal(0),
    total_risk_cost: new Prisma.Decimal(0),
    total_overhead_cost: new Prisma.Decimal(0),
  };
}

function resolveSummaryField(
  categoryCode: string,
): SummaryCostField | null {
  const key = categoryCode.trim().toUpperCase();
  return (
    COST_CATEGORY_TO_SUMMARY_FIELD[
      key as keyof typeof COST_CATEGORY_TO_SUMMARY_FIELD
    ] ?? null
  );
}

function computeSubtotal(totals: CategoryTotals): Prisma.Decimal {
  return sumDecimals(Object.values(totals));
}

function computePricing(subtotal: Prisma.Decimal, marginPercent: Prisma.Decimal) {
  const subtotalNum = subtotal.toNumber();
  const marginNum = marginPercent.toNumber();
  const sellingPrice = subtotal.mul(
    new Prisma.Decimal(1).add(marginPercent.div(100)),
  );
  const grossProfit = sellingPrice.sub(subtotal);
  const grossMarginPercent =
    sellingPrice.gt(0)
      ? grossProfit.div(sellingPrice).mul(100)
      : new Prisma.Decimal(0);

  return {
    subtotal_before_margin: subtotal,
    margin_percent: marginPercent,
    selling_price: sellingPrice,
    gross_profit: grossProfit,
    gross_margin_percent: grossMarginPercent,
    subtotalNum,
    marginNum,
  };
}

function toSummaryView(
  row: {
    boq_summary_id: string;
    boq_version_id: string;
    total_material_cost: Prisma.Decimal;
    total_labor_cost: Prisma.Decimal;
    total_logistics_cost: Prisma.Decimal;
    total_testing_cost: Prisma.Decimal;
    total_documentation_cost: Prisma.Decimal;
    total_indirect_cost: Prisma.Decimal;
    total_risk_cost: Prisma.Decimal;
    total_overhead_cost: Prisma.Decimal;
    subtotal_before_margin: Prisma.Decimal;
    margin_percent: Prisma.Decimal;
    selling_price: Prisma.Decimal;
    gross_profit: Prisma.Decimal;
    gross_margin_percent: Prisma.Decimal;
    updated_at: Date;
  },
  breakdownLineCount: number,
): BoqSummaryView {
  return {
    boq_summary_id: row.boq_summary_id,
    boq_version_id: row.boq_version_id,
    total_material_cost: decimalToNumber(row.total_material_cost) ?? 0,
    total_labor_cost: decimalToNumber(row.total_labor_cost) ?? 0,
    total_logistics_cost: decimalToNumber(row.total_logistics_cost) ?? 0,
    total_testing_cost: decimalToNumber(row.total_testing_cost) ?? 0,
    total_documentation_cost: decimalToNumber(row.total_documentation_cost) ?? 0,
    total_indirect_cost: decimalToNumber(row.total_indirect_cost) ?? 0,
    total_risk_cost: decimalToNumber(row.total_risk_cost) ?? 0,
    total_overhead_cost: decimalToNumber(row.total_overhead_cost) ?? 0,
    subtotal_before_margin: decimalToNumber(row.subtotal_before_margin) ?? 0,
    margin_percent: decimalToNumber(row.margin_percent) ?? 0,
    selling_price: decimalToNumber(row.selling_price) ?? 0,
    gross_profit: decimalToNumber(row.gross_profit) ?? 0,
    gross_margin_percent: decimalToNumber(row.gross_margin_percent) ?? 0,
    breakdown_line_count: breakdownLineCount,
    updated_at: row.updated_at.toISOString(),
  };
}

export const boqSummaryService = {
  async rollupCategoryTotals(boqVersionId: string) {
    const breakdowns = await prisma.boq_cost_breakdowns.findMany({
      where: { boq_line: { boq_version_id: boqVersionId } },
      select: {
        calculated_value: true,
        cost_category: { select: { category_code: true } },
      },
    });

    const totals = emptyCategoryTotals();
    const unmapped: string[] = [];

    for (const row of breakdowns) {
      const field = resolveSummaryField(row.cost_category.category_code);
      if (!field) {
        unmapped.push(row.cost_category.category_code);
        continue;
      }
      totals[field] = totals[field].add(row.calculated_value);
    }

    return { totals, breakdownCount: breakdowns.length, unmappedCodes: [...new Set(unmapped)] };
  },

  async refreshSummary(boqVersionId: string, marginPercent?: number) {
    const existing = await prisma.boq_summary.findUnique({
      where: { boq_version_id: boqVersionId },
    });

    const margin =
      marginPercent != null
        ? new Prisma.Decimal(marginPercent)
        : (existing?.margin_percent ?? new Prisma.Decimal(DEFAULT_MARGIN_PERCENT));

    const { totals, breakdownCount, unmappedCodes } =
      await this.rollupCategoryTotals(boqVersionId);
    const subtotal = computeSubtotal(totals);
    const pricing = computePricing(subtotal, margin);

    const data = {
      ...totals,
      subtotal_before_margin: pricing.subtotal_before_margin,
      margin_percent: pricing.margin_percent,
      selling_price: pricing.selling_price,
      gross_profit: pricing.gross_profit,
      gross_margin_percent: pricing.gross_margin_percent,
    };

    const saved = await prisma.boq_summary.upsert({
      where: { boq_version_id: boqVersionId },
      create: { boq_version_id: boqVersionId, ...data },
      update: data,
    });

    return {
      summary: toSummaryView(saved, breakdownCount),
      unmappedCodes,
    };
  },

  async getSummaryForVersion(boqVersionId: string) {
    const [summary, breakdownCount] = await Promise.all([
      prisma.boq_summary.findUnique({ where: { boq_version_id: boqVersionId } }),
      prisma.boq_cost_breakdowns.count({
        where: { boq_line: { boq_version_id: boqVersionId } },
      }),
    ]);

    if (!summary) {
      return { summary: null, breakdownCount };
    }

    return {
      summary: toSummaryView(summary, breakdownCount),
      breakdownCount,
    };
  },

  async updateMargin(boqVersionId: string, marginPercent: number) {
    await boqVersionService.assertEditable(boqVersionId);
    if (marginPercent < 0 || marginPercent > 100) {
      throw new Error("Margin percent must be between 0 and 100");
    }
    return this.refreshSummary(boqVersionId, marginPercent);
  },
};
