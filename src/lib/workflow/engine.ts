import { NCR, NCRStatus, NCRStep, HistoryEntry, WorkerSnapshot, WorkflowActionData } from '@/types/ncr';
import { now } from '@/lib/utils';

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export interface ActorInfo {
  userId: string;
  userName: string;
}

export interface UserLookup {
  id: string;
  name: string;
}

// The result of a transition — a partial NCR update to be written to Firestore
export interface TransitionResult {
  status: NCRStatus;
  steps: NCRStep[];
  workers: WorkerSnapshot[];
  history: HistoryEntry[];
  participantIds: string[];
  closedAt: string | null;
  updatedAt: string;
}

function addHistory(
  existing: HistoryEntry[],
  actor: ActorInfo,
  action: string,
  comment: string | null = null
): HistoryEntry[] {
  return [
    ...existing,
    { at: now(), actorId: actor.userId, actorName: actor.userName, action, comment },
  ];
}

function buildParticipants(ncr: NCR, extra: string[]): string[] {
  const set = new Set<string>([
    ncr.createdBy,
    ...ncr.steps.map((s) => s.assignedUserId),
    ...ncr.workers.map((w) => w.userId),
    ...extra,
  ]);
  return Array.from(set).filter(Boolean);
}

// ─── Guard: verify actor is the expected assignee ─────────────────────────────

export function assertCanAct(ncr: NCR, actor: ActorInfo): void {
  if (ncr.status === 'CLOSED') {
    throw new WorkflowError('This NCR is closed and cannot be modified.');
  }

  if (ncr.status === 'DRAFT') {
    if (ncr.createdBy !== actor.userId) {
      throw new WorkflowError('Only the NCR creator can submit it.');
    }
    return;
  }

  const stepMap: Partial<Record<NCRStatus, number>> = {
    PENDING_1: 1,
    PENDING_2: 2,
    AMD_REVIEW: 3,
  };

  if (ncr.status === 'FOLLOWUP') {
    if (ncr.createdBy !== actor.userId) {
      throw new WorkflowError('Only the NCR creator can close it.');
    }
    return;
  }

  const stepNum = stepMap[ncr.status];
  if (stepNum === undefined) {
    throw new WorkflowError(`No action allowed in status: ${ncr.status}`);
  }

  const step = ncr.steps.find((s) => s.stepNumber === stepNum);
  if (!step) {
    throw new WorkflowError(`Step ${stepNum} not found on this NCR.`);
  }
  if (step.assignedUserId !== actor.userId) {
    throw new WorkflowError('You are not assigned to act on this step.');
  }
}

// ─── Transitions ──────────────────────────────────────────────────────────────

export function transition(
  ncr: NCR,
  actor: ActorInfo,
  data: WorkflowActionData,
  userLookup: (id: string) => UserLookup | undefined
): TransitionResult {
  assertCanAct(ncr, actor);

  const base: Pick<TransitionResult, 'closedAt' | 'updatedAt'> = {
    closedAt: ncr.closedAt,
    updatedAt: now(),
  };

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  if (data.action === 'SUBMIT') {
    if (!data.approver1) throw new WorkflowError('Approver 1 is required.');
    const approver = userLookup(data.approver1);
    if (!approver) throw new WorkflowError('Approver 1 user not found.');

    const step1: NCRStep = {
      stepNumber: 1,
      assignedUserId: approver.id,
      assignedUserName: approver.name,
      action: null,
      comment: null,
      actedAt: null,
    };
    const steps = [step1];
    const history = addHistory(ncr.history, actor, 'Submitted');
    return {
      ...base,
      status: 'PENDING_1',
      steps,
      workers: ncr.workers,
      history,
      participantIds: buildParticipants({ ...ncr, steps, workers: ncr.workers }, [approver.id]),
    };
  }

  // ── APPROVE_1 ─────────────────────────────────────────────────────────────
  if (data.action === 'APPROVE_1') {
    if (!data.approver2) throw new WorkflowError('Approver 2 is required.');
    const approver2 = userLookup(data.approver2);
    if (!approver2) throw new WorkflowError('Approver 2 user not found.');

    const steps: NCRStep[] = [
      { ...ncr.steps[0], action: 'APPROVED', comment: data.comment ?? null, actedAt: now() },
      {
        stepNumber: 2,
        assignedUserId: approver2.id,
        assignedUserName: approver2.name,
        action: null,
        comment: null,
        actedAt: null,
      },
    ];
    const history = addHistory(ncr.history, actor, 'Approved (Step 1)', data.comment ?? null);
    return {
      ...base,
      status: 'PENDING_2',
      steps,
      workers: ncr.workers,
      history,
      participantIds: buildParticipants({ ...ncr, steps }, [approver2.id]),
    };
  }

  // ── REJECT_1 ──────────────────────────────────────────────────────────────
  if (data.action === 'REJECT_1') {
    if (!data.comment?.trim()) throw new WorkflowError('A rejection reason is required.');
    const steps: NCRStep[] = [
      { ...ncr.steps[0], action: 'REJECTED', comment: data.comment, actedAt: now() },
    ];
    const history = addHistory(ncr.history, actor, 'Rejected → Draft', data.comment);
    return {
      ...base,
      status: 'DRAFT',
      steps,
      workers: ncr.workers,
      history,
      participantIds: buildParticipants({ ...ncr, steps }, []),
    };
  }

  // ── APPROVE_2 ─────────────────────────────────────────────────────────────
  if (data.action === 'APPROVE_2') {
    if (!data.amd) throw new WorkflowError('AMD is required.');
    const amd = userLookup(data.amd);
    if (!amd) throw new WorkflowError('AMD user not found.');

    const workerSnapshots: WorkerSnapshot[] = (data.workers ?? []).map((wId) => {
      const u = userLookup(wId);
      return { userId: wId, userName: u?.name ?? wId };
    });

    const steps: NCRStep[] = [
      ncr.steps[0],
      { ...ncr.steps[1], action: 'APPROVED', comment: data.comment ?? null, actedAt: now() },
      {
        stepNumber: 3,
        assignedUserId: amd.id,
        assignedUserName: amd.name,
        action: null,
        comment: null,
        actedAt: null,
      },
    ];
    const history = addHistory(ncr.history, actor, 'Approved (Step 2)', data.comment ?? null);
    return {
      ...base,
      status: 'AMD_REVIEW',
      steps,
      workers: workerSnapshots,
      history,
      participantIds: buildParticipants(
        { ...ncr, steps, workers: workerSnapshots },
        [amd.id, ...workerSnapshots.map((w) => w.userId)]
      ),
    };
  }

  // ── REJECT_2 ──────────────────────────────────────────────────────────────
  if (data.action === 'REJECT_2') {
    if (!data.comment?.trim()) throw new WorkflowError('A rejection reason is required.');
    // Reset step 1 so Foreman Head must re-approve
    const steps: NCRStep[] = [
      { ...ncr.steps[0], action: null, comment: null, actedAt: null },
      { ...ncr.steps[1], action: 'REJECTED', comment: data.comment, actedAt: now() },
    ];
    const history = addHistory(ncr.history, actor, 'Rejected → Step 1', data.comment);
    return {
      ...base,
      status: 'PENDING_1',
      steps,
      workers: ncr.workers,
      history,
      participantIds: buildParticipants({ ...ncr, steps }, []),
    };
  }

  // ── APPROVE_AMD ───────────────────────────────────────────────────────────
  if (data.action === 'APPROVE_AMD') {
    const steps: NCRStep[] = [
      ncr.steps[0],
      ncr.steps[1],
      { ...ncr.steps[2], action: 'APPROVED', comment: data.comment ?? null, actedAt: now() },
    ];
    const history = addHistory(ncr.history, actor, 'Approved (AMD)', data.comment ?? null);
    return {
      ...base,
      status: 'FOLLOWUP',
      steps,
      workers: ncr.workers,
      history,
      participantIds: buildParticipants({ ...ncr, steps }, []),
    };
  }

  // ── REJECT_AMD ────────────────────────────────────────────────────────────
  if (data.action === 'REJECT_AMD') {
    if (!data.comment?.trim()) throw new WorkflowError('A rejection reason is required.');
    // Reset step 2 so PM must re-approve
    const steps: NCRStep[] = [
      ncr.steps[0],
      { ...ncr.steps[1], action: null, comment: null, actedAt: null },
      { ...ncr.steps[2], action: 'REJECTED', comment: data.comment, actedAt: now() },
    ];
    const history = addHistory(ncr.history, actor, 'Rejected → Step 2', data.comment);
    return {
      ...base,
      status: 'PENDING_2',
      steps,
      workers: ncr.workers,
      history,
      participantIds: buildParticipants({ ...ncr, steps }, []),
    };
  }

  // ── CLOSE ─────────────────────────────────────────────────────────────────
  if (data.action === 'CLOSE') {
    const history = addHistory(ncr.history, actor, 'Closed');
    return {
      status: 'CLOSED',
      steps: ncr.steps,
      workers: ncr.workers,
      history,
      participantIds: ncr.participantIds,
      closedAt: now(),
      updatedAt: now(),
    };
  }

  throw new WorkflowError(`Unknown action: ${(data as WorkflowActionData).action}`);
}
