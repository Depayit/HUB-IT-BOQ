import {
  WORKFLOW_STATE_MASTER,
  getWorkflowStateByCode,
  getWorkflowStateById,
  type WorkflowStateCode,
  type WorkflowStateMasterRow,
} from "@/lib/constants/workflow-states";
import {
  WORKFLOW_ENTITY_STATE_MAPPING,
  WORKFLOW_ENTITY_TYPES,
  getDefaultWorkflowStateForEntity,
  listWorkflowStatesForEntity,
  type WorkflowEntityType,
} from "@/lib/constants/workflow-entity-mapping";
import {
  assertDefinedTransitionTarget,
  assertValidTransition,
  canTransitionBetween,
  isWorkflowStateCode,
} from "@/lib/validations/workflow";
import { AppError } from "@/lib/utils/errors";

export type WorkflowTransitionResult = {
  previous_state: WorkflowStateMasterRow;
  current_state: WorkflowStateMasterRow;
};

export const workflowService = {
  listWorkflowStates(): WorkflowStateMasterRow[] {
    return [...WORKFLOW_STATE_MASTER].sort((a, b) => a.display_order - b.display_order);
  },

  getWorkflowState(
    key: string,
    by: "id" | "code" = "id",
  ): WorkflowStateMasterRow | null {
    if (by === "code") {
      if (!isWorkflowStateCode(key)) return null;
      return getWorkflowStateByCode(key) ?? null;
    }
    return getWorkflowStateById(key) ?? null;
  },

  listEntityTypes(): WorkflowEntityType[] {
    return [...WORKFLOW_ENTITY_TYPES];
  },

  listWorkflowStatesForEntity(entityType: WorkflowEntityType): WorkflowStateMasterRow[] {
    return listWorkflowStatesForEntity(entityType);
  },

  getDefaultWorkflowStateForEntity(entityType: WorkflowEntityType): WorkflowStateMasterRow {
    return getDefaultWorkflowStateForEntity(entityType);
  },

  getEntityStateMapping() {
    return [...WORKFLOW_ENTITY_STATE_MAPPING];
  },

  canTransition(fromState: WorkflowStateCode | string, toState: WorkflowStateCode | string): boolean {
    return canTransitionBetween(fromState, toState);
  },

  transitionState(
    currentState: WorkflowStateCode | string,
    targetState: WorkflowStateCode | string,
  ): WorkflowTransitionResult {
    const previous = assertDefinedTransitionTarget(currentState);
    assertValidTransition(currentState, targetState);

    const next = getWorkflowStateByCode(targetState as WorkflowStateCode);
    if (!next) {
      throw new AppError(
        `Workflow state "${targetState}" ไม่พบใน master`,
        "UNDEFINED_WORKFLOW_STATE",
        404,
      );
    }

    return {
      previous_state: previous,
      current_state: next,
    };
  },
};
