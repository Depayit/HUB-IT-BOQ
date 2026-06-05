import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { documentService, type BoqDocumentLinkRow } from "@/lib/services/document.service";
import { disciplineService, type ProjectDisciplineRow } from "@/lib/services/discipline.service";
import { boqSummaryService, type BoqSummaryView } from "@/lib/services/boq-summary.service";
import {
  COST_CATEGORY_TO_SUMMARY_FIELD,
  type SummaryCostField,
} from "@/lib/constants/cost-categories";

export type BoqVersionOption = {
  boq_version_id: string;
  version_no: number;
  status: string;
  lock_status: string;
  previous_boq_version_id: string | null;
};

export type DocumentChangeRow = {
  document_id: string;
  document_name: string;
  document_type: string;
  detail: string;
};

export type DocumentChanges = {
  added: DocumentChangeRow[];
  removed: DocumentChangeRow[];
  modified: DocumentChangeRow[];
};

export type DisciplineChangeRow = {
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  detail: string;
};

export type DisciplineChanges = {
  included: DisciplineChangeRow[];
  excluded: DisciplineChangeRow[];
  risk_changes: DisciplineChangeRow[];
};

export type CostCategoryChange = {
  field: SummaryCostField;
  label: string;
  before: number;
  after: number;
  delta: number;
};

export type CostChanges = {
  category_totals: CostCategoryChange[];
  grand_total: {
    subtotal_before_margin: { before: number; after: number; delta: number };
    selling_price: { before: number; after: number; delta: number };
  };
  margin: {
    margin_percent: { before: number; after: number; delta: number };
  };
};

export type WorkflowChanges = {
  status: { before: string; after: string } | null;
  approval: {
    before_stage: string | null;
    after_stage: string | null;
    before_status: string | null;
    after_status: string | null;
  } | null;
  lock: { before: string; after: string } | null;
};

export type DifferenceSummary = {
  documents: { added: number; removed: number; modified: number; total: number };
  disciplines: { included: number; excluded: number; risk_changes: number; total: number };
  cost: { category_changes: number; has_grand_total_change: boolean; has_margin_change: boolean; total: number };
  workflow: { total: number };
  total_changes: number;
};

export type RevisionComparisonResult = {
  current: BoqVersionOption;
  baseline: BoqVersionOption;
  documents: DocumentChanges;
  disciplines: DisciplineChanges;
  cost: CostChanges;
  workflow: WorkflowChanges;
  summary: DifferenceSummary;
};

const CATEGORY_LABELS: Record<SummaryCostField, string> = {
  total_material_cost: "Material",
  total_labor_cost: "Labor",
  total_logistics_cost: "Logistics",
  total_testing_cost: "Testing",
  total_documentation_cost: "Documentation",
  total_indirect_cost: "Indirect",
  total_risk_cost: "Risk",
  total_overhead_cost: "Overhead",
};

const SUMMARY_COST_FIELDS = Object.values(
  COST_CATEGORY_TO_SUMMARY_FIELD,
) as SummaryCostField[];

function emptySummary(): BoqSummaryView {
  return {
    boq_summary_id: "",
    boq_version_id: "",
    total_material_cost: 0,
    total_labor_cost: 0,
    total_logistics_cost: 0,
    total_testing_cost: 0,
    total_documentation_cost: 0,
    total_indirect_cost: 0,
    total_risk_cost: 0,
    total_overhead_cost: 0,
    subtotal_before_margin: 0,
    margin_percent: 0,
    selling_price: 0,
    gross_profit: 0,
    gross_margin_percent: 0,
    breakdown_line_count: 0,
    updated_at: "",
  };
}

function linkSignature(link: BoqDocumentLinkRow): string {
  const d = link.document;
  return [
    link.dependency_type,
    link.is_required,
    link.dependency_status,
    d.document_name,
    d.document_type,
    d.document_status,
    d.version_no,
    d.file_link ?? "",
  ].join("|");
}

function formatDocumentRow(
  link: BoqDocumentLinkRow,
  detail: string,
): DocumentChangeRow {
  return {
    document_id: link.document_id,
    document_name: link.document.document_name,
    document_type: link.document.document_type,
    detail,
  };
}

export function compareDocuments(
  baselineLinks: BoqDocumentLinkRow[],
  currentLinks: BoqDocumentLinkRow[],
): DocumentChanges {
  const baselineMap = new Map(baselineLinks.map((l) => [l.document_id, l]));
  const currentMap = new Map(currentLinks.map((l) => [l.document_id, l]));

  const added: DocumentChangeRow[] = [];
  const removed: DocumentChangeRow[] = [];
  const modified: DocumentChangeRow[] = [];

  for (const [id, link] of currentMap) {
    if (!baselineMap.has(id)) {
      added.push(
        formatDocumentRow(link, `เพิ่มลิงก์ ${link.dependency_type} (${link.dependency_status})`),
      );
    }
  }

  for (const [id, link] of baselineMap) {
    if (!currentMap.has(id)) {
      removed.push(
        formatDocumentRow(link, `ถอนลิงก์ ${link.dependency_type}`),
      );
    }
  }

  for (const [id, current] of currentMap) {
    const baseline = baselineMap.get(id);
    if (!baseline) continue;
    if (linkSignature(baseline) !== linkSignature(current)) {
      modified.push(
        formatDocumentRow(
          current,
          `dependency ${baseline.dependency_status} → ${current.dependency_status}`,
        ),
      );
    }
  }

  return { added, removed, modified };
}

function disciplineMap(rows: ProjectDisciplineRow[]) {
  return new Map(rows.map((r) => [r.discipline_id, r]));
}

export function compareDisciplines(
  baselineRows: ProjectDisciplineRow[],
  currentRows: ProjectDisciplineRow[],
): DisciplineChanges {
  const baseline = disciplineMap(baselineRows);
  const current = disciplineMap(currentRows);

  const included: DisciplineChangeRow[] = [];
  const excluded: DisciplineChangeRow[] = [];
  const risk_changes: DisciplineChangeRow[] = [];

  for (const row of currentRows) {
    const prev = baseline.get(row.discipline_id);
    if (!prev) {
      if (row.included_flag) {
        included.push({
          discipline_id: row.discipline_id,
          discipline_code: row.discipline_code,
          discipline_name: row.discipline_name,
          detail: "เพิ่มสาขาและเลือก Included",
        });
      }
      continue;
    }

    if (!prev.included_flag && row.included_flag) {
      included.push({
        discipline_id: row.discipline_id,
        discipline_code: row.discipline_code,
        discipline_name: row.discipline_name,
        detail: "เปลี่ยนเป็น Included",
      });
    } else if (prev.included_flag && !row.included_flag) {
      excluded.push({
        discipline_id: row.discipline_id,
        discipline_code: row.discipline_code,
        discipline_name: row.discipline_name,
        detail: "เปลี่ยนเป็น Excluded",
      });
    }

    if (
      prev.risk_level !== row.risk_level ||
      (prev.scope_description ?? "") !== (row.scope_description ?? "") ||
      (prev.exclusion_note ?? "") !== (row.exclusion_note ?? "")
    ) {
      risk_changes.push({
        discipline_id: row.discipline_id,
        discipline_code: row.discipline_code,
        discipline_name: row.discipline_name,
        detail:
          prev.risk_level !== row.risk_level
            ? `Risk ${prev.risk_level} → ${row.risk_level}`
            : "Scope / exclusion เปลี่ยน",
      });
    }
  }

  for (const row of baselineRows) {
    if (!current.has(row.discipline_id) && row.included_flag) {
      excluded.push({
        discipline_id: row.discipline_id,
        discipline_code: row.discipline_code,
        discipline_name: row.discipline_name,
        detail: "ถอนออกจาก revision",
      });
    }
  }

  return { included, excluded, risk_changes };
}

export function compareCost(
  baselineSummary: BoqSummaryView | null,
  currentSummary: BoqSummaryView | null,
): CostChanges {
  const before = baselineSummary ?? emptySummary();
  const after = currentSummary ?? emptySummary();

  const category_totals: CostCategoryChange[] = [];
  for (const field of SUMMARY_COST_FIELDS) {
    const b = before[field];
    const a = after[field];
    if (b !== a) {
      category_totals.push({
        field,
        label: CATEGORY_LABELS[field],
        before: b,
        after: a,
        delta: a - b,
      });
    }
  }

  return {
    category_totals,
    grand_total: {
      subtotal_before_margin: {
        before: before.subtotal_before_margin,
        after: after.subtotal_before_margin,
        delta: after.subtotal_before_margin - before.subtotal_before_margin,
      },
      selling_price: {
        before: before.selling_price,
        after: after.selling_price,
        delta: after.selling_price - before.selling_price,
      },
    },
    margin: {
      margin_percent: {
        before: before.margin_percent,
        after: after.margin_percent,
        delta: after.margin_percent - before.margin_percent,
      },
    },
  };
}

export function compareWorkflow(
  baseline: {
    status: string;
    lock_status: string;
    approval_stage: string | null;
    approval_status: string | null;
  },
  current: {
    status: string;
    lock_status: string;
    approval_stage: string | null;
    approval_status: string | null;
  },
): WorkflowChanges {
  const status =
    baseline.status !== current.status
      ? { before: baseline.status, after: current.status }
      : null;

  const lock =
    baseline.lock_status !== current.lock_status
      ? { before: baseline.lock_status, after: current.lock_status }
      : null;

  const approvalChanged =
    baseline.approval_stage !== current.approval_stage ||
    baseline.approval_status !== current.approval_status;

  const approval = approvalChanged
    ? {
        before_stage: baseline.approval_stage,
        after_stage: current.approval_stage,
        before_status: baseline.approval_status,
        after_status: current.approval_status,
      }
    : null;

  return { status, approval, lock };
}

export function buildDifferenceSummary(
  documents: DocumentChanges,
  disciplines: DisciplineChanges,
  cost: CostChanges,
  workflow: WorkflowChanges,
): DifferenceSummary {
  const docTotal =
    documents.added.length +
    documents.removed.length +
    documents.modified.length;

  const discTotal =
    disciplines.included.length +
    disciplines.excluded.length +
    disciplines.risk_changes.length;

  const hasGrand =
    cost.grand_total.subtotal_before_margin.delta !== 0 ||
    cost.grand_total.selling_price.delta !== 0;
  const hasMargin = cost.margin.margin_percent.delta !== 0;
  const costTotal =
    cost.category_totals.length + (hasGrand ? 1 : 0) + (hasMargin ? 1 : 0);

  const workflowTotal =
    (workflow.status ? 1 : 0) +
    (workflow.lock ? 1 : 0) +
    (workflow.approval ? 1 : 0);

  return {
    documents: {
      added: documents.added.length,
      removed: documents.removed.length,
      modified: documents.modified.length,
      total: docTotal,
    },
    disciplines: {
      included: disciplines.included.length,
      excluded: disciplines.excluded.length,
      risk_changes: disciplines.risk_changes.length,
      total: discTotal,
    },
    cost: {
      category_changes: cost.category_totals.length,
      has_grand_total_change: hasGrand,
      has_margin_change: hasMargin,
      total: costTotal,
    },
    workflow: { total: workflowTotal },
    total_changes: docTotal + discTotal + costTotal + workflowTotal,
  };
}

function toVersionOption(row: {
  boq_version_id: string;
  version_no: number;
  status: string;
  lock_status: string;
  previous_boq_version_id: string | null;
}): BoqVersionOption {
  return {
    boq_version_id: row.boq_version_id,
    version_no: row.version_no,
    status: row.status,
    lock_status: row.lock_status,
    previous_boq_version_id: row.previous_boq_version_id,
  };
}

export const revisionComparisonService = {
  async listProjectVersions(projectId: string): Promise<BoqVersionOption[]> {
    const rows = await prisma.boq_versions.findMany({
      where: { project_id: projectId },
      orderBy: { version_no: "asc" },
      select: {
        boq_version_id: true,
        version_no: true,
        status: true,
        lock_status: true,
        previous_boq_version_id: true,
      },
    });
    return rows.map(toVersionOption);
  },

  resolveDefaultBaseline(
    current: BoqVersionOption,
    versions: BoqVersionOption[],
  ): BoqVersionOption | null {
    if (current.previous_boq_version_id) {
      return (
        versions.find((v) => v.boq_version_id === current.previous_boq_version_id) ??
        null
      );
    }
    return (
      versions
        .filter((v) => v.version_no < current.version_no)
        .sort((a, b) => b.version_no - a.version_no)[0] ?? null
    );
  },

  async compare(
    projectId: string,
    currentBoqVersionId: string,
    baselineBoqVersionId: string,
  ): Promise<RevisionComparisonResult> {
    const version = await boqVersionService.getById(currentBoqVersionId);
    if (!version || version.project_id !== projectId) {
      throw new AppError("ไม่พบ BOQ Version", "BOQ_VERSION_NOT_FOUND", 404);
    }

    const [currentRow, baselineRow] = await Promise.all([
      prisma.boq_versions.findUnique({
        where: { boq_version_id: currentBoqVersionId },
        include: { approval_workflows: true },
      }),
      prisma.boq_versions.findUnique({
        where: { boq_version_id: baselineBoqVersionId },
        include: { approval_workflows: true },
      }),
    ]);

    if (!currentRow || currentRow.project_id !== projectId) {
      throw new AppError("ไม่พบ revision ปัจจุบัน", "BOQ_VERSION_NOT_FOUND", 404);
    }
    if (!baselineRow || baselineRow.project_id !== projectId) {
      throw new AppError("ไม่พบ revision เปรียบเทียบ", "BASELINE_NOT_FOUND", 404);
    }
    if (currentRow.boq_version_id === baselineRow.boq_version_id) {
      throw new AppError(
        "เลือก revision เปรียบเทียบคนละเวอร์ชัน",
        "SAME_VERSION",
        400,
      );
    }

    const [
      currentDocs,
      baselineDocs,
      currentDisciplines,
      baselineDisciplines,
      currentCost,
      baselineCost,
    ] = await Promise.all([
      documentService.listBoqDocumentLinks(currentBoqVersionId),
      documentService.listBoqDocumentLinks(baselineBoqVersionId),
      disciplineService.getProjectDisciplines(projectId, currentBoqVersionId),
      disciplineService.getProjectDisciplines(projectId, baselineBoqVersionId),
      boqSummaryService.getSummaryForVersion(currentBoqVersionId),
      boqSummaryService.getSummaryForVersion(baselineBoqVersionId),
    ]);

    const documents = compareDocuments(baselineDocs, currentDocs);
    const disciplines = compareDisciplines(baselineDisciplines, currentDisciplines);
    const cost = compareCost(baselineCost.summary, currentCost.summary);
    const workflow = compareWorkflow(
      {
        status: baselineRow.status,
        lock_status: baselineRow.lock_status,
        approval_stage: baselineRow.approval_workflows?.current_stage ?? null,
        approval_status: baselineRow.approval_workflows?.workflow_status ?? null,
      },
      {
        status: currentRow.status,
        lock_status: currentRow.lock_status,
        approval_stage: currentRow.approval_workflows?.current_stage ?? null,
        approval_status: currentRow.approval_workflows?.workflow_status ?? null,
      },
    );

    const summary = buildDifferenceSummary(documents, disciplines, cost, workflow);

    return {
      current: toVersionOption(currentRow),
      baseline: toVersionOption(baselineRow),
      documents,
      disciplines,
      cost,
      workflow,
      summary,
    };
  },
};
