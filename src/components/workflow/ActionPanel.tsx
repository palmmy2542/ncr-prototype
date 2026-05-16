'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NCRStatus, SafeUser } from '@/types/ncr';

interface Props {
  ncrId: string;
  status: NCRStatus;
  users: SafeUser[];
  currentUserId: string;
}

export default function ActionPanel({ ncrId, status, users, currentUserId }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | ''>('');
  const [comment, setComment] = useState('');
  const [approver2, setApprover2] = useState('');
  const [amd, setAmd] = useState('');
  const [workers, setWorkers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isReject = action === 'REJECT';

  const actionTypeMap: Record<string, Record<string, string>> = {
    PENDING_1: { APPROVE: 'APPROVE_1', REJECT: 'REJECT_1' },
    PENDING_2: { APPROVE: 'APPROVE_2', REJECT: 'REJECT_2' },
    AMD_REVIEW: { APPROVE: 'APPROVE_AMD', REJECT: 'REJECT_AMD' },
  };

  async function handleSubmit() {
    setError('');
    if (!action) { setError('Please select Approve or Reject.'); return; }
    if (isReject && !comment.trim()) { setError('A reason is required when rejecting.'); return; }
    if (status === 'PENDING_1' && action === 'APPROVE' && !approver2) { setError('Select Approver 2.'); return; }
    if (status === 'PENDING_2' && action === 'APPROVE' && !amd) { setError('Select AMD.'); return; }

    setSubmitting(true);

    let actionType: string;
    if (status === 'FOLLOWUP') {
      actionType = 'CLOSE';
    } else {
      actionType = actionTypeMap[status]?.[action];
    }

    const res = await fetch(`/api/ncr/${ncrId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionType, comment, approver2, amd, workers }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(data.error ?? 'Error processing action.'); return; }
    router.refresh();
    router.push('/inbox');
  }

  if (status === 'FOLLOWUP') {
    return (
      <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Step 5 — Close NCR
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-stone-600 mb-4">
            AMD has approved. Mark this NCR as complete. <strong>This action is permanent and cannot be undone.</strong>
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm rounded-md transition-colors disabled:opacity-40"
          >
            Mark as Done & Close NCR
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-stone-200 rounded-md outline-none focus:border-emerald-600 transition-colors';
  const labelCls = 'block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5';

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${isReject ? 'border-red-200' : 'border-emerald-200'}`}>
      <div className={`px-5 py-3 border-b ${isReject ? 'border-red-100 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
        <span className={`text-xs font-semibold uppercase tracking-widest ${isReject ? 'text-red-700' : 'text-emerald-700'}`}>
          Your Action
        </span>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Approve / Reject toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(['APPROVE', 'REJECT'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`py-2 text-sm font-medium rounded-md border transition-colors ${
                action === a
                  ? a === 'APPROVE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              {a === 'APPROVE' ? '✓ Approve' : '✕ Reject'}
            </button>
          ))}
        </div>

        {/* Approver 2 (Step 1 → 2) */}
        {action === 'APPROVE' && status === 'PENDING_1' && (
          <div>
            <label className={labelCls}>Select Approver 2 <span className="text-red-500">*</span></label>
            <select className={inputCls} value={approver2} onChange={(e) => setApprover2(e.target.value)}>
              <option value="">— Select user —</option>
              {users.filter((u) => u.id !== currentUserId).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Workers + AMD (Step 2 → AMD) */}
        {action === 'APPROVE' && status === 'PENDING_2' && (
          <>
            <div>
              <label className={labelCls}>Assign Workers <span className="text-stone-400">(view-only access)</span></label>
              <div className="border border-stone-200 rounded-md max-h-36 overflow-y-auto">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={workers.includes(u.id)}
                      onChange={(e) =>
                        setWorkers(e.target.checked ? [...workers, u.id] : workers.filter((id) => id !== u.id))
                      }
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Select AMD <span className="text-red-500">*</span></label>
              <select className={inputCls} value={amd} onChange={(e) => setAmd(e.target.value)}>
                <option value="">— Select user —</option>
                {users.filter((u) => u.id !== currentUserId).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Comment */}
        <div>
          <label className={labelCls}>
            Comment {isReject && <span className="text-red-500 normal-case">* required for rejection</span>}
          </label>
          <textarea
            className={inputCls}
            rows={3}
            placeholder={isReject ? 'Explain the reason for rejection…' : 'Optional comment…'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!action || submitting}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-40 ${
            isReject
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white'
          }`}
        >
          {submitting ? 'Processing…' : isReject ? 'Reject & Return' : 'Approve & Advance →'}
        </button>
      </div>
    </div>
  );
}
