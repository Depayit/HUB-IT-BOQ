/**
 * Readiness 3-tier aggregate (TD-7A-006 closure).
 *
 * SSOT for the BOQ readiness state surfaced on the summary report. Replaces
 * the previous binary `Ready` / `Not Ready` aggregate; the new tier reads
 * from validation severity (BLOCK / WARNING / INFO) without introducing any
 * readiness rule outside the validation engine.
 *
 * Tier rules (deterministic; gate-first):
 *   Blocked  : unresolved BLOCK present, OR validation engine forbids approval
 *   Warning  : no BLOCK, but at least one open WARNING (non-resolved/non-pass)
 *   Ready    : no BLOCK, no open WARNING, validation has been run, approval allowed
 *
 * If validation has not been run yet, tier is `Not Ready` (informational —
 * we keep the legacy label in this case for backwards compatibility with
 * existing UI that reads the report).
 */

export const READINESS_TIERS = ["Ready", "Warning", "Blocked", "Not Ready"] as const;
export type ReadinessTier = (typeof READINESS_TIERS)[number];

export type ValidationRunContext = {
  validation_result_count: number;
  lock_status: string;
  boq_status?: string;
  unresolved_block_count: number;
  can_approve: boolean;
};

/**
 * The validation engine persists only failures. A clean post-run (0 rows) still
 * means validation executed — infer that from Locked + clear gate when needed.
 */
export function inferValidationRun(ctx: ValidationRunContext): boolean {
  if (ctx.validation_result_count > 0) return true;
  const locked =
    ctx.lock_status === "Locked" || ctx.boq_status === "Locked";
  return (
    locked &&
    ctx.unresolved_block_count === 0 &&
    ctx.can_approve
  );
}

/** SSOT label for BOQ Summary Report / export Validation Summary status. */
export function deriveValidationStatus(
  unresolved_block_count: number,
  validationRun: boolean,
): string {
  if (unresolved_block_count > 0) {
    return `Blocked (${unresolved_block_count} unresolved)`;
  }
  if (!validationRun) return "Not run";
  return "Pass";
}

export type ReadinessInput = {
  /** True if validation has been run for this BOQ version (see inferValidationRun). */
  validation_run: boolean;
  /** Count of unresolved BLOCK validations from `getWorkflowGate`. */
  unresolved_block_count: number;
  /** Count of unresolved (non-passed/non-overridden) WARNING validations. */
  open_warning_count: number;
  /** Whether the engine permits approval (no approval-blocking BLOCK). */
  can_approve: boolean;
};

export function deriveReadinessTier(input: ReadinessInput): ReadinessTier {
  if (input.unresolved_block_count > 0 || !input.can_approve) {
    return "Blocked";
  }
  if (!input.validation_run) {
    return "Not Ready";
  }
  if (input.open_warning_count > 0) {
    return "Warning";
  }
  return "Ready";
}

/** True if the tier permits forward action (approve / handoff / export). */
export function isReadyTier(tier: ReadinessTier): boolean {
  return tier === "Ready";
}

/** True if the tier permits forward action with a review flag (Warning is allowed forward). */
export function isForwardableTier(tier: ReadinessTier): boolean {
  return tier === "Ready" || tier === "Warning";
}
