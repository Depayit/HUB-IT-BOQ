"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { executeHandoff } from "@/lib/actions/handoff.actions";

type HandoffActionsProps = {
  projectId: string;
  boqVersionId: string;
  initialCanHandoff: boolean;
  initialBlockMessages: string[];
};

export function HandoffActions({
  projectId,
  boqVersionId,
  initialCanHandoff,
  initialBlockMessages,
}: HandoffActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [canHandoff, setCanHandoff] = useState(initialCanHandoff);
  const [blockMessages, setBlockMessages] = useState(initialBlockMessages);
  const [remarks, setRemarks] = useState("");

  const handleHandoff = () => {
    setError(null);
    startTransition(async () => {
      const res = await executeHandoff(
        projectId,
        boqVersionId,
        "user",
        remarks || undefined,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRemarks("");
      setCanHandoff(res.can_handoff);
      setBlockMessages(res.block_messages);
      router.refresh();
    });
  };

  const disabled = !canHandoff || pending;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="handoff-remarks" className="block text-sm font-medium text-neutral-700">
          Remarks
        </label>
        <textarea
          id="handoff-remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="หมายเหตุ (optional)"
        />
      </div>

      <button
        type="button"
        onClick={handleHandoff}
        disabled={disabled}
        title={!canHandoff ? blockMessages.join(" · ") || "Handoff ถูกบล็อก" : undefined}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {pending ? "กำลังดำเนินการ..." : "Execute Handoff"}
      </button>

      {!canHandoff && blockMessages.length > 0 && (
        <ul className="list-inside list-disc text-xs text-red-700">
          {blockMessages.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
    </div>
  );
}
