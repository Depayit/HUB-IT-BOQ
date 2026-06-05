"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDocumentAction,
  deleteDocumentAction,
  linkDocumentAction,
  unlinkDocumentAction,
  updateDependencyStatusAction,
  updateDocumentAction,
  type DocumentsPageLinkRow,
  type DocumentsPageDocumentRow,
} from "@/lib/actions/document.actions";
import {
  DOCUMENT_TYPES,
  documentSchema,
  type DocumentInput,
} from "@/lib/validations/document";

type DependencySummary = {
  required_count: number;
  satisfied_count: number;
  pending_count: number;
  all_required_satisfied: boolean;
};

type MissingRequired = {
  rule: string;
  document_type: string;
  message: string;
};

type DocumentPanelProps = {
  projectId: string;
  boqVersionId: string;
  boqVersionNo: number;
  documents: DocumentsPageDocumentRow[];
  links: DocumentsPageLinkRow[];
  dependencySummary: DependencySummary;
  stageRequirements: Record<string, string[]>;
  missingRequired: MissingRequired[];
  isEditable: boolean;
};

const DOCUMENT_STATUSES = ["Draft", "Active", "Superseded", "Archived"] as const;
const DEPENDENCY_STATUSES = ["Pending", "Satisfied", "Waived", "NotApplicable"] as const;

const emptyDocumentForm: DocumentInput = {
  document_type: "TOR",
  document_name: "",
  version_no: "1.0",
  document_status: "Draft",
  file_link: null,
  related_workflow_stage: null,
};

export function DocumentPanel({
  projectId,
  boqVersionId,
  boqVersionNo,
  documents: initialDocuments,
  links: initialLinks,
  dependencySummary: initialSummary,
  stageRequirements,
  missingRequired,
  isEditable,
}: DocumentPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [documents, setDocuments] = useState(initialDocuments);
  const [links, setLinks] = useState(initialLinks);
  const [dependencySummary, setDependencySummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);

  const [linkDocumentId, setLinkDocumentId] = useState("");
  const [linkDependencyType, setLinkDependencyType] = useState("Required");
  const [linkIsRequired, setLinkIsRequired] = useState(true);

  const linkByDocId = useMemo(
    () => new Map(links.map((l) => [l.document_id, l])),
    [links],
  );

  const selectedDocument = useMemo(
    () => documents.find((d) => d.document_id === selectedDocumentId),
    [documents, selectedDocumentId],
  );

  const unlinkedDocuments = useMemo(
    () => documents.filter((d) => !linkByDocId.has(d.document_id)),
    [documents, linkByDocId],
  );

  const form = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema) as unknown as Resolver<DocumentInput>,
    defaultValues: emptyDocumentForm,
  });

  const refresh = () => router.refresh();

  const openCreate = () => {
    setError(null);
    setMode("create");
    setSelectedDocumentId(undefined);
    setShowForm(true);
    form.reset(emptyDocumentForm);
  };

  const openEdit = (doc: DocumentsPageDocumentRow) => {
    setError(null);
    setMode("edit");
    setSelectedDocumentId(doc.document_id);
    setShowForm(true);
    form.reset({
      document_type: doc.document_type as DocumentInput["document_type"],
      document_name: doc.document_name,
      version_no: doc.version_no,
      document_status: doc.document_status as DocumentInput["document_status"],
      file_link: doc.file_link,
      related_workflow_stage: doc.related_workflow_stage,
    });
  };

  const onSaveDocument = form.handleSubmit((data) => {
    setError(null);
    startTransition(async () => {
      if (mode === "create") {
        const result = await createDocumentAction(projectId, boqVersionId, data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setDocuments((prev) => [...prev, result.document]);
        setSelectedDocumentId(result.document.document_id);
        setMode("edit");
      } else if (selectedDocumentId) {
        const result = await updateDocumentAction(
          selectedDocumentId,
          projectId,
          boqVersionId,
          data,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setDocuments((prev) =>
          prev.map((d) => (d.document_id === selectedDocumentId ? result.document : d)),
        );
        const updatedLinks = await fetchUpdatedLinks();
        if (updatedLinks) setLinks(updatedLinks);
      }
      refresh();
    });
  });

  const fetchUpdatedLinks = async () => {
    return links;
  };

  const onDeleteDocument = () => {
    if (!selectedDocumentId) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDocumentAction(selectedDocumentId, projectId, boqVersionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.document_id !== selectedDocumentId));
      setLinks((prev) => prev.filter((l) => l.document_id !== selectedDocumentId));
      setShowForm(false);
      setSelectedDocumentId(undefined);
      refresh();
    });
  };

  const onLinkDocument = () => {
    if (!linkDocumentId) {
      setError("กรุณาเลือกเอกสารที่จะลิงก์");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await linkDocumentAction(projectId, boqVersionId, {
        document_id: linkDocumentId,
        dependency_type: linkDependencyType,
        is_required: linkIsRequired,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLinks(result.links);
      setDependencySummary(result.dependencySummary);
      setLinkDocumentId("");
      refresh();
    });
  };

  const onUnlink = (boqVersionDocumentId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await unlinkDocumentAction(projectId, boqVersionId, boqVersionDocumentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLinks(result.links);
      setDependencySummary(result.dependencySummary);
      refresh();
    });
  };

  const onUpdateDependencyStatus = (
    boqVersionDocumentId: string,
    dependency_status: (typeof DEPENDENCY_STATUSES)[number],
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await updateDependencyStatusAction(
        projectId,
        boqVersionId,
        boqVersionDocumentId,
        { dependency_status },
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLinks(result.links);
      setDependencySummary(result.dependencySummary);
      refresh();
    });
  };

  return (
    <div className="space-y-8">
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          dependencySummary.all_required_satisfied
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <p className="font-medium">สรุป Dependency — BOQ v{boqVersionNo}</p>
        <p className="mt-1">
          Required: {dependencySummary.required_count} · Satisfied/Waived:{" "}
          {dependencySummary.satisfied_count} · Pending: {dependencySummary.pending_count}
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">เอกสารที่ยังขาด (validation rules)</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {missingRequired.map((m) => (
              <li key={m.rule}>{m.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        <p className="font-medium">Stage Document Requirements</p>
        <ul className="mt-2 space-y-1">
          {Object.entries(stageRequirements).map(([stage, types]) => (
            <li key={stage}>
              <span className="font-medium">{stage}:</span> {types.join(", ")}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">รายการเอกสาร (Project Catalog)</h2>
          {isEditable && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              + สร้างเอกสารใหม่
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">document_type</th>
                <th className="px-4 py-3 font-medium">document_name</th>
                <th className="px-4 py-3 font-medium">version_no</th>
                <th className="px-4 py-3 font-medium">document_status</th>
                <th className="px-4 py-3 font-medium">dependency_type</th>
                <th className="px-4 py-3 font-medium">dependency_status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    ยังไม่มีเอกสาร — กด &quot;สร้างเอกสารใหม่&quot; เพื่อเพิ่มรายการ
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const link = linkByDocId.get(doc.document_id);
                  return (
                    <tr
                      key={doc.document_id}
                      className="border-b border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3">{doc.document_type}</td>
                      <td className="px-4 py-3">{doc.document_name}</td>
                      <td className="px-4 py-3">{doc.version_no}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.document_status} />
                      </td>
                      <td className="px-4 py-3">{link?.dependency_type ?? "—"}</td>
                      <td className="px-4 py-3">
                        {link ? (
                          <StatusBadge status={link.dependency_status} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(doc)}
                          className="text-blue-600 hover:underline"
                        >
                          แก้ไข
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "สร้างเอกสารใหม่" : `แก้ไขเอกสาร — ${selectedDocument?.document_name ?? ""}`}
          </h2>
          <form onSubmit={onSaveDocument} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="document_type *">
                <select
                  disabled={pending}
                  className={inputClass}
                  {...form.register("document_type")}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="document_status *">
                <select
                  disabled={pending || !isEditable}
                  className={inputClass}
                  {...form.register("document_status")}
                >
                  {DOCUMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="document_name *">
              <input
                disabled={pending || !isEditable}
                className={inputClass}
                {...form.register("document_name")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="version_no *">
                <input
                  disabled={pending || !isEditable}
                  className={inputClass}
                  {...form.register("version_no")}
                />
              </Field>
              <Field label="file_link">
                <input
                  disabled={pending || !isEditable}
                  placeholder="https://..."
                  className={inputClass}
                  {...form.register("file_link")}
                />
              </Field>
            </div>
            {isEditable && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {pending ? "กำลังบันทึก..." : mode === "create" ? "สร้างเอกสาร" : "บันทึกการแก้ไข"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
                >
                  ปิด
                </button>
                {mode === "edit" && selectedDocumentId && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onDeleteDocument}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    ลบเอกสาร
                  </button>
                )}
              </div>
            )}
          </form>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">ลิงก์เอกสารกับ BOQ Version (boq_version_documents)</h2>
        <p className="text-sm text-neutral-600">
          BOQ v{boqVersionNo} — ลิงก์เอกสารจาก project catalog เพื่อกำหนด dependency
        </p>

        {isEditable && documents.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-700">เพิ่มลิงก์เอกสาร</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field label="เอกสาร">
                <select
                  value={linkDocumentId}
                  onChange={(e) => setLinkDocumentId(e.target.value)}
                  disabled={pending}
                  className={inputClass}
                >
                  <option value="">— เลือกเอกสาร —</option>
                  {(unlinkedDocuments.length > 0 ? unlinkedDocuments : documents).map((d) => (
                    <option key={d.document_id} value={d.document_id}>
                      {d.document_type} — {d.document_name} (v{d.version_no})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="dependency_type">
                <input
                  value={linkDependencyType}
                  onChange={(e) => setLinkDependencyType(e.target.value)}
                  disabled={pending}
                  className={inputClass}
                  placeholder="Required"
                />
              </Field>
              <Field label="is_required">
                <label className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={linkIsRequired}
                    onChange={(e) => setLinkIsRequired(e.target.checked)}
                    disabled={pending}
                  />
                  <span className="text-sm">Required dependency</span>
                </label>
              </Field>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={pending || !linkDocumentId}
                  onClick={onLinkDocument}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  ลิงก์กับ BOQ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">document_name</th>
                <th className="px-4 py-3 font-medium">document_type</th>
                <th className="px-4 py-3 font-medium">dependency_type</th>
                <th className="px-4 py-3 font-medium">is_required</th>
                <th className="px-4 py-3 font-medium">dependency_status</th>
                {isEditable && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {links.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEditable ? 6 : 5}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    ยังไม่มีเอกสารที่ลิงก์กับ BOQ version นี้
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr
                    key={link.boq_version_document_id}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">{link.document.document_name}</td>
                    <td className="px-4 py-3">{link.document.document_type}</td>
                    <td className="px-4 py-3">{link.dependency_type}</td>
                    <td className="px-4 py-3">{link.is_required ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      {isEditable ? (
                        <select
                          value={link.dependency_status}
                          disabled={pending}
                          onChange={(e) =>
                            onUpdateDependencyStatus(
                              link.boq_version_document_id,
                              e.target.value as (typeof DEPENDENCY_STATUSES)[number],
                            )
                          }
                          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                        >
                          {DEPENDENCY_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={link.dependency_status} />
                      )}
                    </td>
                    {isEditable && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onUnlink(link.boq_version_document_id)}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          ยกเลิกลิงก์
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-800",
    Draft: "bg-neutral-100 text-neutral-700",
    Superseded: "bg-amber-100 text-amber-800",
    Archived: "bg-neutral-200 text-neutral-600",
    Satisfied: "bg-emerald-100 text-emerald-800",
    Pending: "bg-amber-100 text-amber-800",
    Waived: "bg-blue-100 text-blue-800",
    NotApplicable: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-neutral-100 text-neutral-700"}`}
    >
      {status}
    </span>
  );
}
