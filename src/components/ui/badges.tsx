import { NCRStatus, Severity, STATUS_LABELS } from '@/types/ncr';

const STATUS_STYLES: Record<NCRStatus, string> = {
  DRAFT: 'bg-stone-100 text-stone-600',
  PENDING_1: 'bg-blue-50 text-blue-700',
  PENDING_2: 'bg-blue-50 text-blue-700',
  AMD_REVIEW: 'bg-purple-50 text-purple-700',
  FOLLOWUP: 'bg-amber-50 text-amber-700',
  CLOSED: 'bg-emerald-50 text-emerald-700',
};

const SEV_STYLES: Record<Severity, string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700',
  Critical: 'bg-red-50 text-red-700',
};

export function StatusBadge({ status }: { status: NCRStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${SEV_STYLES[severity]}`}>
      {severity}
    </span>
  );
}
