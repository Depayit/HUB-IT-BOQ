"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceApprovalStage } from "@/lib/actions/approval.actions";

type ApprovalActionsProps = {
  projectId: string;
  boqVersionId: string;
  canApprove: boolean;
  currentStage: string;
  workflowStatus: string;
  blockMessages: string[];
};

export function ApprovalActions({
  projectId,
  boqVersionId,
  canApprove,
  currentStage,
  workflowStatus,
  blockMessages,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAdvance = () => {
    setError(null);
    startTransition(async () => {
      const res = await advanceApprovalStage(projectId, boqVersionId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const disabled = !canApprove || pending || workflowStatus === "Completed";

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        Stage ปัจจุบัน: <strong>{currentStage}</strong> ({workflowStatus})
      </p>
      <button
        type="button"
        onClick={handleAdvance}
        disabled={disabled}
        title={
          !canApprove
            ? blockMessages.join(" · ") || "ถูกบล็อกโดย validation หรือ design basis"
            : undefined
        }
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {pending ? "กำลังดำเนินการ..." : "ดำเนินการขั้นถัดไป (Approval)"}
      </button>
      {!canApprove && (
        <p className="text-xs text-red-700">
          ปุ่มถูกปิด — มี unresolved BLOCK หรือ Design Basis ยังไม่ Approved
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
    </div>
  );
}
