// ─── Enums ────────────────────────────────────────────────────────────────────

export const NCRStatus = {
  DRAFT: 'DRAFT',
  PENDING_1: 'PENDING_1',
  PENDING_2: 'PENDING_2',
  AMD_REVIEW: 'AMD_REVIEW',
  FOLLOWUP: 'FOLLOWUP',
  CLOSED: 'CLOSED',
} as const;
export type NCRStatus = (typeof NCRStatus)[keyof typeof NCRStatus];

export const StepAction = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type StepAction = (typeof StepAction)[keyof typeof StepAction];

export const Severity = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const Department = {
  Production: 'Production',
  Installer: 'Installer',
  Accountant: 'Accountant',
  Seller: 'Seller',
} as const;
export type Department = (typeof Department)[keyof typeof Department];

export type WorkflowActionType =
  | 'SUBMIT'
  | 'APPROVE_1'
  | 'REJECT_1'
  | 'APPROVE_2'
  | 'REJECT_2'
  | 'APPROVE_AMD'
  | 'REJECT_AMD'
  | 'CLOSE';

// ─── Snapshots ────────────────────────────────────────────────────────────────

export interface UserSnapshot {
  userId: string;
  userName: string;
}

export interface WorkerSnapshot extends UserSnapshot {}

// ─── Step ─────────────────────────────────────────────────────────────────────

export interface NCRStep {
  stepNumber: 1 | 2 | 3;
  assignedUserId: string;
  assignedUserName: string; // snapshot
  action: StepAction | null;
  comment: string | null;
  actedAt: string | null; // ISO string
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  at: string; // ISO string
  actorId: string;
  actorName: string;
  action: string;
  comment: string | null;
}

// ─── NCR Document ─────────────────────────────────────────────────────────────

export interface NCR {
  id: string;
  ref: string; // NCR-YYYY-NNN
  status: NCRStatus;

  // Step 1 fields
  problem: string;
  severity: Severity;
  department: Department;

  // Ownership
  createdBy: string; // userId
  createdByName: string; // snapshot
  createdAt: string; // ISO string
  updatedAt: string;
  closedAt: string | null;

  // Workflow
  steps: NCRStep[]; // max 3
  workers: WorkerSnapshot[]; // assigned at step 2
  history: HistoryEntry[];

  // Firestore query helper — all userIds who appear on this NCR
  participantIds: string[];
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roles: string[];
  createdAt: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

// ─── Workflow action input ─────────────────────────────────────────────────────

export interface WorkflowActionData {
  action: WorkflowActionType;
  comment?: string;
  approver1?: string; // userId
  approver2?: string; // userId
  amd?: string; // userId
  workers?: string[]; // userIds
}

// ─── Status display helpers ───────────────────────────────────────────────────

export const STATUS_LABELS: Record<NCRStatus, string> = {
  DRAFT: 'Draft',
  PENDING_1: 'Pending Approval 1',
  PENDING_2: 'Pending Approval 2',
  AMD_REVIEW: 'AMD Review',
  FOLLOWUP: 'Follow-up & Close',
  CLOSED: 'Closed',
};

export const STEP_ACTORS: Partial<Record<NCRStatus, string>> = {
  PENDING_1: 'Foreman Head',
  PENDING_2: 'PM / Dept. Owner',
  AMD_REVIEW: 'Asst. MD',
  FOLLOWUP: 'NCR Creator',
};
