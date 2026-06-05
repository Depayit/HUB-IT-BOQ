import { z } from "zod";
import {
  WORKFLOW_STATE_CODES,
  WORKFLOW_STATE_TRANSITIONS,
  getWorkflowStateByCode,
  type WorkflowStateCode,
  type WorkflowStateMasterRow,
} from "@/lib/constants/workflow-states";
import { AppError } from "@/lib/utils/errors";

export {
  evaluateDesignBasisApproval,
  evaluateHandoffLock,
  projectRequiresSld,
} from "@/lib/validations/workflow-governance";

export const workflowStateCodeSchema = z.enum(WORKFLOW_STATE_CODES, {
  errorMap: () => ({ message: "Workflow state ไม่ถูกต้อง" }),
});

export const workflowTransitionSchema = z.object({
  from_state: workflowStateCodeSchema,
  to_state: workflowStateCodeSchema,
});

export function isWorkflowStateCode(value: string): value is WorkflowStateCode {
  return (WORKFLOW_STATE_CODES as readonly string[]).includes(value);
}

export function assertValidWorkflowState(code: string): WorkflowStateMasterRow {
  if (!isWorkflowStateCode(code)) {
    throw new AppError(
      `Workflow state "${code}" ไม่ถูกต้อง`,
      "INVALID_WORKFLOW_STATE",
      400,
    );
  }

  const row = getWorkflowStateByCode(code);
  if (!row) {
    throw new AppError(
      `Workflow state "${code}" ไม่พบใน master`,
      "UNDEFINED_WORKFLOW_STATE",
      404,
    );
  }

  return row;
}

export function assertDefinedTransitionTarget(
  state: string | undefined | null,
): WorkflowStateMasterRow {
  if (state == null || state.trim() === "") {
    throw new AppError("ต้องระบุ workflow state", "UNDEFINED_TRANSITION_TARGET", 400);
  }

  return assertValidWorkflowState(state);
}

export function canTransitionBetween(fromState: string, toState: string): boolean {
  if (!isWorkflowStateCode(fromState) || !isWorkflowStateCode(toState)) {
    return false;
  }

  return (WORKFLOW_STATE_TRANSITIONS[fromState] as readonly string[]).includes(toState);
}

export function assertValidTransition(fromState: string, toState: string): void {
  assertDefinedTransitionTarget(fromState);
  assertValidWorkflowState(toState);

  if (!canTransitionBetween(fromState, toState)) {
    throw new AppError(
      `ไม่สามารถเปลี่ยนจาก ${fromState} เป็น ${toState}`,
      "INVALID_WORKFLOW_TRANSITION",
      400,
    );
  }
}
