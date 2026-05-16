'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SafeUser } from '@/types/ncr';

export default function NewNCRPage() {
  const router = useRouter();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [form, setForm] = useState({ problem: '', severity: '', department: '', approver1: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }, []);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleAction(submitNow: boolean) {
    setError('');
    if (!form.problem.trim() || !form.severity || !form.department || !form.approver1) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/ncr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, submitNow }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error?.formErrors?.[0] ?? data.error ?? 'Error'); return; }
    router.push(`/ncr/${data.ncr.id}`);
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-stone-200 rounded-md outline-none focus:border-emerald-600 transition-colors bg-white';
  const labelCls = 'block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5';

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-stone-900">Create NCR</h1>
        <p className="text-sm text-stone-400 mt-0.5">Non-conformance report</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">Step 1 — NCR Details</span>
          <span className="text-xs text-stone-400 font-mono">Actor: Foreman</span>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className={labelCls}>Problem Description <span className="text-red-500">*</span></label>
            <textarea
              className={inputCls}
              rows={4}
              placeholder="Describe the non-conformance in detail…"
              value={form.problem}
              onChange={(e) => set('problem', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Severity <span className="text-red-500">*</span></label>
              <select className={inputCls} value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                <option value="">— Select —</option>
                {['Low', 'Medium', 'High', 'Critical'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department <span className="text-red-500">*</span></label>
              <select className={inputCls} value={form.department} onChange={(e) => set('department', e.target.value)}>
                <option value="">— Select —</option>
                {['Production', 'Installer', 'Accountant', 'Seller'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Approver 1 (Foreman Head) <span className="text-red-500">*</span></label>
            <select className={inputCls} value={form.approver1} onChange={(e) => set('approver1', e.target.value)}>
              <option value="">— Select user —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mt-4">{error}</p>
      )}

      <div className="flex gap-3 mt-5">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm border border-stone-200 rounded-md text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => handleAction(false)}
          disabled={submitting}
          className="px-4 py-2 text-sm border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={submitting}
          className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors disabled:opacity-40"
        >
          Submit for Approval →
        </button>
      </div>
    </div>
  );
}
