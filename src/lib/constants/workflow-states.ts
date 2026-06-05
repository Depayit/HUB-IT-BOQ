/** Master rows for workflow_state_master (in-memory foundation — no DB) */
export const WORKFLOW_STATE_CODES = [
  "DRAFT",
  "UNDER_REVIEW",
  "RETURNED",
  "APPROVED",
  "LOCKED",
] as const;

export type WorkflowStateCode = (typeof WORKFLOW_STATE_CODES)[number];

export type WorkflowStateMasterRow = {
  workflow_state_id: string;
  workflow_code: WorkflowStateCode;
  workflow_name: string;
  display_order: number;
  is_terminal: boolean;
};

export const WORKFLOW_STATE_MASTER: WorkflowStateMasterRow[] = [
  {
    workflow_state_id: "10000000-0000-4000-8000-000000000001",
    workflow_code: "DRAFT",
    workflow_name: "Draft",
    display_order: 1,
    is_terminal: false,
  },
  {
    workflow_state_id: "10000000-0000-4000-8000-000000000002",
    workflow_code: "UNDER_REVIEW",
    workflow_name: "Under Review",
    display_order: 2,
    is_terminal: false,
  },
  {
    workflow_state_id: "10000000-0000-4000-8000-000000000003",
    workflow_code: "RETURNED",
    workflow_name: "Returned",
    display_order: 3,
    is_terminal: false,
  },
  {
    workflow_state_id: "10000000-0000-4000-8000-000000000004",
    workflow_code: "APPROVED",
    workflow_name: "Approved",
    display_order: 4,
    is_terminal: false,
  },
  {
    workflow_state_id: "10000000-0000-4000-8000-000000000005",
    workflow_code: "LOCKED",
    workflow_name: "Locked",
    display_order: 5,
    is_terminal: true,
  },
];

/** Allowed lifecycle transitions between workflow states */
export const WORKFLOW_STATE_TRANSITIONS: Record<
  WorkflowStateCode,
  readonly WorkflowStateCode[]
> = {
  DRAFT: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "RETURNED"],
  RETURNED: ["DRAFT", "UNDER_REVIEW"],
  APPROVED: ["LOCKED"],
  LOCKED: [],
};

export function getWorkflowStateByCode(
  code: WorkflowStateCode,
): WorkflowStateMasterRow | undefined {
  return WORKFLOW_STATE_MASTER.find((row) => row.workflow_code === code);
}

export function getWorkflowStateById(
  workflowStateId: string,
): WorkflowStateMasterRow | undefined {
  return WORKFLOW_STATE_MASTER.find((row) => row.workflow_state_id === workflowStateId);
}
