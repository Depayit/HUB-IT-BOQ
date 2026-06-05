import { describe, it, expect } from "vitest";
import { WORKFLOW_STATE_MASTER } from "@/lib/constants/workflow-states";
import {
  WORKFLOW_ENTITY_TYPES,
  getDefaultWorkflowStateForEntity,
  listWorkflowStatesForEntity,
} from "@/lib/constants/workflow-entity-mapping";
import { workflowService } from "@/lib/services/workflow.service";
import {
  assertDefinedTransitionTarget,
  assertValidTransition,
  assertValidWorkflowState,
  canTransitionBetween,
  workflowTransitionSchema,
} from "@/lib/validations/workflow";
import { AppError } from "@/lib/utils/errors";

describe("workflow validation", () => {
  it("accepts valid workflow states", () => {
    for (const state of WORKFLOW_STATE_MASTER) {
      const row = assertValidWorkflowState(state.workflow_code);
      expect(row.workflow_state_id).toBe(state.workflow_state_id);
    }
  });

  it("rejects invalid workflow state", () => {
    expect(() => assertValidWorkflowState("Published")).toThrow(AppError);
  });

  it("blocks transition to undefined state", () => {
    expect(() => assertDefinedTransitionTarget(undefined)).toThrow(AppError);
    expect(() => assertDefinedTransitionTarget("")).toThrow(AppError);
  });

  it("allows valid transitions", () => {
    expect(canTransitionBetween("DRAFT", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionBetween("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionBetween("APPROVED", "LOCKED")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionBetween("DRAFT", "APPROVED")).toBe(false);
    expect(() => assertValidTransition("LOCKED", "DRAFT")).toThrow(AppError);
  });

  it("rejects undefined target in transition schema", () => {
    const result = workflowTransitionSchema.safeParse({
      from_state: "DRAFT",
      to_state: "NotAState",
    });
    expect(result.success).toBe(false);
  });
});

describe("workflow service", () => {
  it("lists workflow states in display order", () => {
    const states = workflowService.listWorkflowStates();
    expect(states).toHaveLength(5);
    expect(states[0]?.workflow_code).toBe("DRAFT");
    expect(states[4]?.is_terminal).toBe(true);
  });

  it("maps all required entities to workflow states", () => {
    for (const entityType of WORKFLOW_ENTITY_TYPES) {
      const states = listWorkflowStatesForEntity(entityType);
      expect(states).toHaveLength(5);
      expect(getDefaultWorkflowStateForEntity(entityType).workflow_code).toBe("DRAFT");
    }
  });

  it("transitions state when valid", () => {
    const result = workflowService.transitionState("DRAFT", "UNDER_REVIEW");
    expect(result.previous_state.workflow_code).toBe("DRAFT");
    expect(result.current_state.workflow_code).toBe("UNDER_REVIEW");
  });
});
