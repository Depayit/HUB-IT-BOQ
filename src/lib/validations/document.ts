import { z } from "zod";

export const DOCUMENT_TYPES = [
  "TOR",
  "SLD",
  "Specification",
  "Test",
  "As-built",
  "Handover",
  "Training",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const WORKFLOW_STAGES = [
  "Engineer Review",
  "Manager Approval",
  "Director Approval",
  "Handoff",
  "Final Lock",
] as const;

const optionalUrl = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\/.+/i.test(v), {
    message: "File link must be a valid http(s) URL or empty",
  });

export const documentSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  document_name: z.string().min(1, "Document name is required").max(255),
  file_link: optionalUrl,
  version_no: z.string().min(1, "Version is required").max(32),
  document_status: z.enum(["Draft", "Active", "Superseded", "Archived"]).default("Draft"),
  related_workflow_stage: z
    .string()
    .max(64)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export const linkDocumentSchema = z.object({
  document_id: z.string().uuid(),
  dependency_type: z.string().min(1).max(64),
  is_required: z.boolean().default(true),
});

export const updateDependencyStatusSchema = z.object({
  dependency_status: z.enum(["Pending", "Satisfied", "Waived", "NotApplicable"]),
});

export type DocumentInput = z.infer<typeof documentSchema>;
export type LinkDocumentInput = z.infer<typeof linkDocumentSchema>;

/** Required document types checked at validation run */
export const REQUIRED_DOC_RULES = [
  { ruleCode: "DOC_TOR_REQUIRED", docType: "TOR", label: "Terms of Reference (TOR)" },
  { ruleCode: "DOC_SLD_REQUIRED", docType: "SLD", label: "Single Line Diagram (SLD)" },
  {
    ruleCode: "DOC_SPEC_HANDOFF",
    docType: "Specification",
    label: "Specification (Handoff)",
  },
] as const;
