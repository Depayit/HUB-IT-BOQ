import { describe, it, expect } from "vitest";

import {
  READINESS_TIERS,
  deriveReadinessTier,
  inferValidationRun,
  isForwardableTier,
  isReadyTier,
  type ReadinessInput,
} from "@/lib/validations/readiness";

function build(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    validation_run: true,
    unresolved_block_count: 0,
    open_warning_count: 0,
    can_approve: true,
    ...overrides,
  };
}

describe("readiness tier (TD-7A-006 — 3-tier aggregate)", () => {
  it("exports four tiers in canonical order (Ready, Warning, Blocked, Not Ready)", () => {
    expect(READINESS_TIERS).toEqual(["Ready", "Warning", "Blocked", "Not Ready"]);
  });

  it("Ready when no BLOCK, no WARNING, validation run, approval allowed", () => {
    expect(deriveReadinessTier(build())).toBe("Ready");
  });

  it("Warning when no BLOCK but at least one open WARNING", () => {
    expect(deriveReadinessTier(build({ open_warning_count: 1 }))).toBe("Warning");
    expect(deriveReadinessTier(build({ open_warning_count: 5 }))).toBe("Warning");
  });

  it("Blocked when unresolved_block_count > 0 (regardless of warnings)", () => {
    expect(deriveReadinessTier(build({ unresolved_block_count: 1 }))).toBe("Blocked");
    expect(
      deriveReadinessTier(
        build({ unresolved_block_count: 2, open_warning_count: 3 }),
      ),
    ).toBe("Blocked");
  });

  it("Blocked when can_approve=false even with no BLOCK count (engine veto)", () => {
    expect(deriveReadinessTier(build({ can_approve: false }))).toBe("Blocked");
  });

  it("Not Ready when validation has never been run (no rows yet)", () => {
    expect(deriveReadinessTier(build({ validation_run: false }))).toBe("Not Ready");
  });

  it("Not Ready takes precedence over Ready but not over Blocked", () => {
    // Validation never run + no can_approve -> Blocked wins
    expect(
      deriveReadinessTier(
        build({ validation_run: false, can_approve: false, unresolved_block_count: 0 }),
      ),
    ).toBe("Blocked");
    // Validation never run + warnings (impossible state but defensive)
    expect(
      deriveReadinessTier(build({ validation_run: false, open_warning_count: 3 })),
    ).toBe("Not Ready");
  });

  it("isReadyTier strict — only Ready returns true", () => {
    expect(isReadyTier("Ready")).toBe(true);
    expect(isReadyTier("Warning")).toBe(false);
    expect(isReadyTier("Blocked")).toBe(false);
    expect(isReadyTier("Not Ready")).toBe(false);
  });

  it("isForwardableTier — Ready and Warning permit forward action; Blocked/Not Ready do not", () => {
    expect(isForwardableTier("Ready")).toBe(true);
    expect(isForwardableTier("Warning")).toBe(true);
    expect(isForwardableTier("Blocked")).toBe(false);
    expect(isForwardableTier("Not Ready")).toBe(false);
  });

  it("inferValidationRun — 0 failure rows after clean run on Locked BOQ counts as run", () => {
    expect(
      inferValidationRun({
        validation_result_count: 0,
        lock_status: "Locked",
        boq_status: "Locked",
        unresolved_block_count: 0,
        can_approve: true,
      }),
    ).toBe(true);
  });

  it("inferValidationRun — 0 rows on Draft BOQ without lock is not run", () => {
    expect(
      inferValidationRun({
        validation_result_count: 0,
        lock_status: "Unlocked",
        boq_status: "Draft",
        unresolved_block_count: 0,
        can_approve: true,
      }),
    ).toBe(false);
  });

  it("Truth table coverage (all combinations of inputs)", () => {
    const cases: Array<[ReadinessInput, "Ready" | "Warning" | "Blocked" | "Not Ready"]> = [
      [build({ validation_run: true, unresolved_block_count: 0, open_warning_count: 0, can_approve: true }), "Ready"],
      [build({ validation_run: true, unresolved_block_count: 0, open_warning_count: 1, can_approve: true }), "Warning"],
      [build({ validation_run: true, unresolved_block_count: 1, open_warning_count: 0, can_approve: true }), "Blocked"],
      [build({ validation_run: true, unresolved_block_count: 0, open_warning_count: 0, can_approve: false }), "Blocked"],
      [build({ validation_run: false, unresolved_block_count: 0, open_warning_count: 0, can_approve: true }), "Not Ready"],
      [build({ validation_run: true, unresolved_block_count: 5, open_warning_count: 5, can_approve: false }), "Blocked"],
    ];
    for (const [input, expected] of cases) {
      expect(deriveReadinessTier(input)).toBe(expected);
    }
  });
});
