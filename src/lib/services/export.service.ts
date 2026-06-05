import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  boqSummaryReportService,
  type BoqSummaryReport,
} from "@/lib/services/boq-summary-report.service";
import { boqVersionService } from "@/lib/services/boq-version.service";
import { assertSummaryExists } from "@/lib/validations/export";

export type ExportFileResult = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

function formatMoney(value: number, currency: string): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function buildExportFilename(
  projectName: string,
  versionNo: number,
  format: "xlsx" | "pdf",
): string {
  const safeName = projectName.replace(/[^\w-]+/g, "_").slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === "xlsx" ? "xlsx" : "pdf";
  return `BOQ_Summary_${safeName}_v${versionNo}_${date}.${ext}`;
}

function pdfSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text(title);
  doc.fontSize(10).font("Helvetica");
}

function pdfKeyValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.text(`${label}: ${value}`);
}

async function buildExcelWorkbook(report: BoqSummaryReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HUB IT BOQ";
  workbook.created = new Date(report.generated_at);

  const info = workbook.addWorksheet("Export Info");
  info.addRow(["Generated at", report.generated_at]);
  info.addRow(["Project", report.project.project_name]);
  info.addRow(["BOQ Version", report.project.boq_version_no]);
  info.addRow(["Workflow Status", report.project.workflow_status]);
  info.addRow(["Approval Status", report.project.approval_status]);
  info.addRow(["Handoff Status", report.project.handoff_status]);

  const projectSheet = workbook.addWorksheet("Project Summary");
  projectSheet.addRow(["Field", "Value"]);
  projectSheet.addRow(["Project Name", report.project.project_name]);
  projectSheet.addRow(["BOQ Version", report.project.boq_version_no]);
  projectSheet.addRow(["Workflow Status", report.project.workflow_status]);
  projectSheet.addRow(["Approval Status", report.project.approval_status]);
  projectSheet.addRow(["Lock Status", report.project.lock_status]);
  projectSheet.addRow(["Handoff Status", report.project.handoff_status]);

  const documentSheet = workbook.addWorksheet("Document Summary");
  documentSheet.addRow(["Total Documents", report.document.total_documents]);
  documentSheet.addRow(["Missing Documents", report.document.missing_documents]);
  documentSheet.addRow(["Required Documents", report.document.required_documents]);
  documentSheet.addRow([
    "Validation Status",
    report.document.document_validation_status,
  ]);

  const disciplineSheet = workbook.addWorksheet("Discipline Summary");
  disciplineSheet.addRow(["Included Disciplines"]);
  report.discipline.included_disciplines.forEach((item) =>
    disciplineSheet.addRow([item]),
  );
  disciplineSheet.addRow([]);
  disciplineSheet.addRow(["Excluded Disciplines"]);
  report.discipline.excluded_disciplines.forEach((item) =>
    disciplineSheet.addRow([item]),
  );
  disciplineSheet.addRow([]);
  disciplineSheet.addRow(["Blocked Disciplines"]);
  report.discipline.blocked_disciplines.forEach((item) =>
    disciplineSheet.addRow([item]),
  );
  disciplineSheet.addRow([]);
  disciplineSheet.addRow(["Risk — Low", report.discipline.risk_summary.low]);
  disciplineSheet.addRow(["Risk — Medium", report.discipline.risk_summary.medium]);
  disciplineSheet.addRow(["Risk — High", report.discipline.risk_summary.high]);
  disciplineSheet.addRow([
    "Risk — Critical",
    report.discipline.risk_summary.critical,
  ]);

  const costSheet = workbook.addWorksheet("Cost Summary");
  const cost = report.cost;
  costSheet.addRow(["Category", "Amount"]);
  costSheet.addRow(["Material Total", cost.material_total]);
  costSheet.addRow(["Labor Total", cost.labor_total]);
  costSheet.addRow(["Logistics Total", cost.logistics_total]);
  costSheet.addRow(["Testing Total", cost.testing_total]);
  costSheet.addRow(["Documentation Total", cost.documentation_total]);
  costSheet.addRow(["Indirect Total", cost.indirect_total]);
  costSheet.addRow(["Risk Total", cost.risk_total]);
  costSheet.addRow(["Overhead Total", cost.overhead_total]);
  costSheet.addRow(["Subtotal", cost.subtotal]);
  costSheet.addRow(["Grand Total (Selling Price)", cost.grand_total]);

  const validationSheet = workbook.addWorksheet("Validation Summary");
  validationSheet.addRow(["Validation Status", report.validation.validation_status]);
  validationSheet.addRow([
    "Total Validation Rules",
    report.validation.total_validation_rules,
  ]);
  validationSheet.addRow(["Warning Count", report.validation.warning_count]);
  validationSheet.addRow(["Block Count", report.validation.block_count]);
  validationSheet.addRow(["Ready Status", report.validation.ready_status]);
  validationSheet.addRow(["Total Results", report.validation.total_results]);
  validationSheet.addRow([
    "Unresolved BLOCKs",
    report.validation.unresolved_blocks,
  ]);
  validationSheet.addRow([
    "Can Approve",
    report.validation.can_approve ? "Yes" : "No",
  ]);
  validationSheet.addRow([
    "Can Handoff",
    report.validation.can_handoff ? "Yes" : "No",
  ]);

  if (report.validation.results.length > 0) {
    validationSheet.addRow([]);
    validationSheet.addRow(["Rule", "Severity", "Status", "Message"]);
    for (const row of report.validation.results) {
      validationSheet.addRow([
        row.rule_code,
        row.severity,
        row.result_status,
        row.message,
      ]);
    }
  }

  for (const sheet of workbook.worksheets) {
    const header = sheet.getRow(1);
    if (header?.cellCount) {
      header.font = { bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function buildPdfDocument(report: BoqSummaryReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text("BOQ Summary Report", {
      align: "center",
    });
    doc.fontSize(10).font("Helvetica");
    doc.moveDown();

    pdfKeyValue(
      doc,
      "Generated",
      new Date(report.generated_at).toLocaleString("en-US"),
    );
    pdfKeyValue(doc, "Workflow Status", report.project.workflow_status);
    pdfKeyValue(doc, "Approval Status", report.project.approval_status);

    pdfSectionTitle(doc, "1. Project Summary");
    pdfKeyValue(doc, "Project Name", report.project.project_name);
    pdfKeyValue(doc, "BOQ Version", String(report.project.boq_version_no));
    pdfKeyValue(doc, "Workflow Status", report.project.workflow_status);
    pdfKeyValue(doc, "Approval Status", report.project.approval_status);
    pdfKeyValue(doc, "Lock Status", report.project.lock_status);
    pdfKeyValue(doc, "Handoff Status", report.project.handoff_status);

    pdfSectionTitle(doc, "2. Document Summary");
    pdfKeyValue(doc, "Total Documents", String(report.document.total_documents));
    pdfKeyValue(doc, "Missing Documents", String(report.document.missing_documents));
    pdfKeyValue(
      doc,
      "Required Documents",
      String(report.document.required_documents),
    );
    pdfKeyValue(
      doc,
      "Validation Status",
      report.document.document_validation_status,
    );

    pdfSectionTitle(doc, "3. Discipline Summary");
    doc.text(`Included (${report.discipline.included_disciplines.length}):`);
    report.discipline.included_disciplines.forEach((item) =>
      doc.text(`  • ${item}`),
    );
    doc.text(`Excluded (${report.discipline.excluded_disciplines.length}):`);
    report.discipline.excluded_disciplines.forEach((item) =>
      doc.text(`  • ${item}`),
    );
    if (report.discipline.blocked_disciplines.length > 0) {
      doc.text("Blocked:");
      report.discipline.blocked_disciplines.forEach((item) =>
        doc.text(`  • ${item}`),
      );
    }
    doc.text(
      `Risk: Low ${report.discipline.risk_summary.low}, Medium ${report.discipline.risk_summary.medium}, High ${report.discipline.risk_summary.high}, Critical ${report.discipline.risk_summary.critical}`,
    );

    pdfSectionTitle(doc, "4. Cost Summary");
    const cost = report.cost;
    pdfKeyValue(doc, "Material Total", formatMoney(cost.material_total, cost.currency));
    pdfKeyValue(doc, "Labor Total", formatMoney(cost.labor_total, cost.currency));
    pdfKeyValue(
      doc,
      "Logistics Total",
      formatMoney(cost.logistics_total, cost.currency),
    );
    pdfKeyValue(doc, "Testing Total", formatMoney(cost.testing_total, cost.currency));
    pdfKeyValue(
      doc,
      "Documentation Total",
      formatMoney(cost.documentation_total, cost.currency),
    );
    pdfKeyValue(doc, "Indirect Total", formatMoney(cost.indirect_total, cost.currency));
    pdfKeyValue(doc, "Risk Total", formatMoney(cost.risk_total, cost.currency));
    pdfKeyValue(doc, "Overhead Total", formatMoney(cost.overhead_total, cost.currency));
    pdfKeyValue(doc, "Subtotal", formatMoney(cost.subtotal, cost.currency));
    pdfKeyValue(doc, "Grand Total", formatMoney(cost.grand_total, cost.currency));

    pdfSectionTitle(doc, "5. Validation Summary");
    pdfKeyValue(doc, "Status", report.validation.validation_status);
    pdfKeyValue(
      doc,
      "Total Validation Rules",
      String(report.validation.total_validation_rules),
    );
    pdfKeyValue(doc, "Warning Count", String(report.validation.warning_count));
    pdfKeyValue(doc, "Block Count", String(report.validation.block_count));
    pdfKeyValue(doc, "Ready Status", report.validation.ready_status);
    pdfKeyValue(
      doc,
      "Unresolved BLOCKs",
      String(report.validation.unresolved_blocks),
    );

    doc.end();
  });
}

export const exportService = {
  async loadReportForExport(projectId: string, boqVersionId: string) {
    const version = await boqVersionService.getById(boqVersionId);
    if (!version || version.project_id !== projectId) {
      return { ok: false as const, error: "Invalid BOQ version for project" };
    }

    const report = await boqSummaryReportService.getBoqSummaryReport(
      projectId,
      boqVersionId,
    );
    if (!report) {
      return { ok: false as const, error: "Summary data does not exist" };
    }

    try {
      assertSummaryExists(report.summary);
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Summary data does not exist",
      };
    }

    // Export BLOCK gate — never export a BOQ that has unresolved BLOCK validations.
    if (report.validation.unresolved_blocks > 0) {
      return {
        ok: false as const,
        error: `Export ถูกบล็อก — มี unresolved BLOCK ${report.validation.unresolved_blocks} รายการ ต้อง resolve ก่อน export`,
      };
    }

    return { ok: true as const, report, version };
  },

  async exportToExcel(projectId: string, boqVersionId: string): Promise<ExportFileResult> {
    const loaded = await this.loadReportForExport(projectId, boqVersionId);
    if (!loaded.ok) {
      throw new Error(loaded.error);
    }

    return {
      buffer: await buildExcelWorkbook(loaded.report),
      filename: buildExportFilename(
        loaded.version.project.project_name,
        loaded.version.version_no,
        "xlsx",
      ),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  },

  async exportToPdf(projectId: string, boqVersionId: string): Promise<ExportFileResult> {
    const loaded = await this.loadReportForExport(projectId, boqVersionId);
    if (!loaded.ok) {
      throw new Error(loaded.error);
    }

    return {
      buffer: await buildPdfDocument(loaded.report),
      filename: buildExportFilename(
        loaded.version.project.project_name,
        loaded.version.version_no,
        "pdf",
      ),
      mimeType: "application/pdf",
    };
  },
};
