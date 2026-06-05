import {
  WORKFLOW_STATE_CODES,
  WORKFLOW_STATE_MASTER,
  type WorkflowStateCode,
  type WorkflowStateMasterRow,
} from "@/lib/constants/workflow-states";

/** Entity types that participate in the shared workflow lifecycle */
export const WORKFLOW_ENTITY_TYPES = [
  "Project",
  "Document",
  "Discipline",
  "CostLayer",
] as const;

export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[number];

export type WorkflowEntityStateMappingRow = {
  entity_type: WorkflowEntityType;
  workflow_state_id: string;
  workflow_code: WorkflowStateCode;
  is_default: boolean;
};

function buildEntityMappings(): WorkflowEntityStateMappingRow[] {
  const rows: WorkflowEntityStateMappingRow[] = [];

  for (const entity_type of WORKFLOW_ENTITY_TYPES) {
    for (const state of WORKFLOW_STATE_MASTER) {
      rows.push({
        entity_type,
        workflow_state_id: state.workflow_state_id,
        workflow_code: state.workflow_code,
        is_default: state.workflow_code === "DRAFT",
      });
    }
  }

  return rows;
}

/** Maps Project, Document, Discipline, and Cost Layer to workflow states */
export const WORKFLOW_ENTITY_STATE_MAPPING: WorkflowEntityStateMappingRow[] =
  buildEntityMappings();

export function listWorkflowStatesForEntity(
  entityType: WorkflowEntityType,
): WorkflowStateMasterRow[] {
  const allowedCodes = new Set(
    WORKFLOW_ENTITY_STATE_MAPPING.filter((row) => row.entity_type === entityType).map(
      (row) => row.workflow_code,
    ),
  );

  return WORKFLOW_STATE_MASTER.filter((row) => allowedCodes.has(row.workflow_code));
}

export function getDefaultWorkflowStateForEntity(
  entityType: WorkflowEntityType,
): WorkflowStateMasterRow {
  const mapping = WORKFLOW_ENTITY_STATE_MAPPING.find(
    (row) => row.entity_type === entityType && row.is_default,
  );
  const code = mapping?.workflow_code ?? WORKFLOW_STATE_CODES[0];
  const state = WORKFLOW_STATE_MASTER.find((row) => row.workflow_code === code);
  if (!state) {
    throw new Error(`Default workflow state not found for entity ${entityType}`);
  }
  return state;
}
