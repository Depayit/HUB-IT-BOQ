import { boqSummaryReportService } from "@/lib/services/boq-summary-report.service";
import {
  validateReportCompleteness,
  type BoqConsolidatedReport,
  type ReportValidationResult,
} from "@/lib/validations/reporting";

export const reportingValidationService = {
  validateReport(report: BoqConsolidatedReport): ReportValidationResult {
    return validateReportCompleteness(report);
  },

  async validateBoqVersion(
    projectId: string,
    boqVersionId: string,
  ): Promise<{ report: BoqConsolidatedReport; validation: ReportValidationResult }> {
    const report = await boqSummaryReportService.buildConsolidatedReport(
      projectId,
      boqVersionId,
    );
    const validation = validateReportCompleteness(report);
    return { report, validation };
  },
};
