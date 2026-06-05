import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
import { boqVersionService } from "@/lib/services/boq-version.service";
import type { BoqSummaryView } from "@/lib/services/boq-summary.service";

export const EXPORT_FORMATS = ["xlsx", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const exportRequestSchema = z.object({
  project_id: z.string().uuid("Project ID ไม่ถูกต้อง"),
  boq_version_id: z.string().uuid("BOQ version ID ไม่ถูกต้อง"),
  format: z.enum(EXPORT_FORMATS, {
    errorMap: () => ({ message: "Format ต้องเป็น xlsx หรือ pdf" }),
  }),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;

export function assertSummaryExists(summary: BoqSummaryView | null | undefined): void {
  if (summary == null) {
    throw new AppError(
      "Summary data does not exist — refresh BOQ summary first",
      "SUMMARY_NOT_FOUND",
      404,
    );
  }
}

export async function assertValidBoqVersionForProject(
  projectId: string,
  boqVersionId: string,
) {
  const version = await boqVersionService.getById(boqVersionId);
  if (!version || version.project_id !== projectId) {
    throw new AppError(
      "Invalid BOQ version for project",
      "INVALID_BOQ_VERSION",
      400,
    );
  }
  return version;
}

export function parseExportRequest(input: unknown): ExportRequest {
  return exportRequestSchema.parse(input);
}
