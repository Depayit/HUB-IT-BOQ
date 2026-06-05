type WorkflowGateBannerProps = {
  canProceed: boolean;
  blockMessages: string[];
  title: string;
};

export function WorkflowGateBanner({
  canProceed,
  blockMessages,
  title,
}: WorkflowGateBannerProps) {
  if (canProceed && blockMessages.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-medium">{title} — พร้อมดำเนินการ</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      <p className="font-medium">{title} — ถูกบล็อก</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {blockMessages.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}
