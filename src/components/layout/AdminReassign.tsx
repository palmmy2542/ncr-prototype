'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NCR, SafeUser } from '@/types/ncr';
import { STATUS_LABELS } from '@/types/ncr';

interface Props {
  assignableNCRs: NCR[];
  users: SafeUser[];
}

export default function AdminReassign({ assignableNCRs, users }: Props) {
  const router = useRouter();
  const [ncrId, setNcrId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleReassign() {
    if (!ncrId || !userId) { setMsg('Select both an NCR and a user.'); return; }
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ncrId, newUserId: userId }),
    });
    setLoading(false);
    if (res.ok) {
      setMsg('Reassigned successfully.');
      setNcrId(''); setUserId('');
      router.refresh();
    } else {
      const d = await res.json();
      setMsg(d.error ?? 'Error');
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-stone-200 rounded-md outline-none focus:border-emerald-600 transition-colors';
  const labelCls = 'block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5';

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100 bg-stone-50">
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">Reassign Step</span>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
          ⚠ Reassignment is silent — no history entry will be created.
        </div>
        <div>
          <label className={labelCls}>In-progress NCR</label>
          <select className={inputCls} value={ncrId} onChange={(e) => setNcrId(e.target.value)}>
            <option value="">— Select NCR —</option>
            {assignableNCRs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.ref} · {STATUS_LABELS[n.status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>New Assignee</label>
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">— Select user —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        {msg && (
          <p className={`text-xs px-3 py-2 rounded border ${msg.includes('success') ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
            {msg}
          </p>
        )}
        <button
          onClick={handleReassign}
          disabled={loading}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm rounded-md transition-colors disabled:opacity-40"
        >
          Reassign →
        </button>
      </div>
    </div>
  );
}
