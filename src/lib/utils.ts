import { NCRStatus } from '@/types/ncr';

export function now(): string {
  return new Date().toISOString();
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// NCR ref generation — called server-side only
// Format: NCR-YYYY-NNN (sequence stored in Firestore counter doc)
export function buildRef(year: number, seq: number): string {
  return `NCR-${year}-${String(seq).padStart(3, '0')}`;
}

// Derive the current assignee userId from an NCR status + steps
export function getCurrentAssigneeId(
  status: NCRStatus,
  createdBy: string,
  steps: { stepNumber: number; assignedUserId: string }[]
): string | null {
  if (status === 'DRAFT' || status === 'FOLLOWUP') return createdBy;
  const stepMap: Partial<Record<NCRStatus, number>> = {
    PENDING_1: 1,
    PENDING_2: 2,
    AMD_REVIEW: 3,
  };
  const num = stepMap[status];
  if (num === undefined) return null;
  return steps.find((s) => s.stepNumber === num)?.assignedUserId ?? null;
}

export function canUserAct(
  status: NCRStatus,
  createdBy: string,
  steps: { stepNumber: number; assignedUserId: string }[],
  userId: string
): boolean {
  if (status === 'CLOSED' || status === 'DRAFT') return false;
  return getCurrentAssigneeId(status, createdBy, steps) === userId;
}
