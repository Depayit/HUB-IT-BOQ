/**
 * Readiness Framework SSOT — management readiness tier aggregation.
 * Maps validation outcome to a 3-tier readiness status.
 * No readiness logic should live outside this module.
 */
export const READINESS_TIERS = ["Ready", "Warning", "Blocked"] as const;
export type ReadinessTier = (typeof READINESS_TIERS)[number];

export type ReadinessInput = {
  validation_run: boolean;
  unresolved_block_count: number;
  open_warning_count: number;
  can_approve: boolean;
};

/**
 * Tier rules:
 * - Blocked: validation not run, or unresolved BLOCK present, or approval gate closed.
 * - Warning: no blocks, approval allowed, but open WARNING findings remain.
 * - Ready: validation run, no blocks, no open warnings, approval allowed.
 */
export function deriveReadinessTier(input: ReadinessInput): ReadinessTier {
  if (!input.validation_run) return "Blocked";
  if (input.unresolved_block_count > 0 || !input.can_approve) return "Blocked";
  if (input.open_warning_count > 0) return "Warning";
  return "Ready";
}

export function readinessMeaning(tier: ReadinessTier): string {
  switch (tier) {
    case "Ready":
      return "พร้อมดำเนินการต่อ (approve / handoff / export)";
    case "Warning":
      return "ไปต่อได้แต่ต้อง review — มี WARNING ที่ยังไม่ resolve";
    case "Blocked":
      return "ห้าม approve / handoff / export — มี BLOCK หรือยังไม่ผ่าน gate";
  }
}
