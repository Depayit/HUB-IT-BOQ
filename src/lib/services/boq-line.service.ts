import { Prisma, type boq_lines } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { decimalToNumber } from "@/lib/utils/decimal";
import type { BoqLineInput } from "@/lib/validations/boq-line";
import { boqVersionService } from "@/lib/services/boq-version.service";

export type BoqLineValidationStatus = {
  passes: boolean;
  message: string | null;
  cost_layer_total: number;
};

export type DisciplineOption = {
  project_discipline_id: string;
  discipline_code: string;
  discipline_name: string;
};

export type BoqLineClientRow = {
  boq_line_id: string;
  boq_version_id: string;
  project_discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  item_id: string | null;
  line_no: number;
  item_description: string;
  unit: string;
  quantity: number;
  cost_source: string | null;
  confidence_level: string | null;
  is_critical_line: boolean;
  notes: string | null;
  cost_layer_total: number;
  validation: BoqLineValidationStatus;
  created_at: string;
  updated_at: string;
};

type LineWithRelations = boq_lines & {
  project_discipline: {
    discipline: { discipline_code: string; discipline_name: string };
  };
  boq_cost_breakdowns: { calculated_value: Prisma.Decimal }[];
};

function sumCostLayerTotal(breakdowns: { calculated_value: Prisma.Decimal }[]): number {
  return breakdowns.reduce((sum, row) => sum + row.calculated_value.toNumber(), 0);
}

export function evaluateCriticalLineValidation(
  isCritical: boolean,
  costLayerTotal: number,
): BoqLineValidationStatus {
  if (!isCritical) {
    return { passes: true, message: null, cost_layer_total: costLayerTotal };
  }
  if (costLayerTotal <= 0) {
    return {
      passes: false,
      message: "Critical line ต้องมี cost layer รวมมากกว่า 0",
      cost_layer_total: costLayerTotal,
    };
  }
  return { passes: true, message: null, cost_layer_total: costLayerTotal };
}

function toLineData(boqVersionId: string, input: BoqLineInput, lineNo: number) {
  return {
    boq_version_id: boqVersionId,
    project_discipline_id: input.project_discipline_id,
    item_id: input.item_id ?? null,
    line_no: lineNo,
    item_description: input.item_description,
    unit: input.unit.trim(),
    quantity: new Prisma.Decimal(input.quantity),
    cost_source: input.cost_source ?? null,
    confidence_level: input.confidence_level ?? null,
    is_critical_line: input.is_critical_line,
    notes: input.notes ?? null,
  };
}

function formatLine(row: LineWithRelations): BoqLineClientRow {
  const cost_layer_total = sumCostLayerTotal(row.boq_cost_breakdowns);
  return {
    boq_line_id: row.boq_line_id,
    boq_version_id: row.boq_version_id,
    project_discipline_id: row.project_discipline_id,
    discipline_code: row.project_discipline.discipline.discipline_code,
    discipline_name: row.project_discipline.discipline.discipline_name,
    item_id: row.item_id,
    line_no: row.line_no,
    item_description: row.item_description,
    unit: row.unit,
    quantity: decimalToNumber(row.quantity) ?? 0,
    cost_source: row.cost_source,
    confidence_level: row.confidence_level,
    is_critical_line: row.is_critical_line,
    notes: row.notes,
    cost_layer_total,
    validation: evaluateCriticalLineValidation(row.is_critical_line, cost_layer_total),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const lineInclude = {
  project_discipline: {
    include: { discipline: { select: { discipline_code: true, discipline_name: true } } },
  },
  boq_cost_breakdowns: { select: { calculated_value: true } },
} as const;

export const boqLineService = {
  async listByBoqVersion(boqVersionId: string): Promise<BoqLineClientRow[]> {
    const rows = await prisma.boq_lines.findMany({
      where: { boq_version_id: boqVersionId },
      include: lineInclude,
      orderBy: { line_no: "asc" },
    });
    return rows.map(formatLine);
  },

  async findCriticalLineValidationFailures(boqVersionId: string) {
    const lines = await this.listByBoqVersion(boqVersionId);
    return lines.filter((l) => l.is_critical_line && !l.validation.passes);
  },

  async listDisciplineOptions(boqVersionId: string): Promise<DisciplineOption[]> {
    const rows = await prisma.project_disciplines.findMany({
      where: { boq_version_id: boqVersionId, included_flag: true },
      include: {
        discipline: { select: { discipline_code: true, discipline_name: true } },
      },
      orderBy: { discipline: { discipline_code: "asc" } },
    });
    return rows.map((r) => ({
      project_discipline_id: r.project_discipline_id,
      discipline_code: r.discipline.discipline_code,
      discipline_name: r.discipline.discipline_name,
    }));
  },

  async create(boqVersionId: string, input: BoqLineInput): Promise<BoqLineClientRow> {
    await boqVersionService.assertEditable(boqVersionId);

    const discipline = await prisma.project_disciplines.findFirst({
      where: {
        project_discipline_id: input.project_discipline_id,
        boq_version_id: boqVersionId,
      },
    });
    if (!discipline) {
      throw new AppError("ไม่พบ discipline ใน BOQ version นี้", "DISCIPLINE_NOT_FOUND", 404);
    }

    let lineNo = input.line_no;
    if (!lineNo) {
      const max = await prisma.boq_lines.aggregate({
        where: { boq_version_id: boqVersionId },
        _max: { line_no: true },
      });
      lineNo = (max._max.line_no ?? 0) + 1;
    }

    const row = await prisma.boq_lines.create({
      data: toLineData(boqVersionId, input, lineNo),
      include: lineInclude,
    });
    return formatLine(row);
  },

  async update(
    boqLineId: string,
    boqVersionId: string,
    input: BoqLineInput,
  ): Promise<BoqLineClientRow> {
    await boqVersionService.assertEditable(boqVersionId);

    const existing = await prisma.boq_lines.findFirst({
      where: { boq_line_id: boqLineId, boq_version_id: boqVersionId },
    });
    if (!existing) {
      throw new AppError("ไม่พบ BOQ line", "BOQ_LINE_NOT_FOUND", 404);
    }

    const discipline = await prisma.project_disciplines.findFirst({
      where: {
        project_discipline_id: input.project_discipline_id,
        boq_version_id: boqVersionId,
      },
    });
    if (!discipline) {
      throw new AppError("ไม่พบ discipline ใน BOQ version นี้", "DISCIPLINE_NOT_FOUND", 404);
    }

    const lineNo = input.line_no ?? existing.line_no;

    const row = await prisma.boq_lines.update({
      where: { boq_line_id: boqLineId },
      data: toLineData(boqVersionId, input, lineNo),
      include: lineInclude,
    });
    return formatLine(row);
  },

  async delete(boqLineId: string, boqVersionId: string): Promise<void> {
    await boqVersionService.assertEditable(boqVersionId);

    const existing = await prisma.boq_lines.findFirst({
      where: { boq_line_id: boqLineId, boq_version_id: boqVersionId },
    });
    if (!existing) {
      throw new AppError("ไม่พบ BOQ line", "BOQ_LINE_NOT_FOUND", 404);
    }

    await prisma.boq_lines.delete({ where: { boq_line_id: boqLineId } });
  },
};
