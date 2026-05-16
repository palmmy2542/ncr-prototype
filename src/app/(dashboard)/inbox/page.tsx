import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getInboxForUser, getHistoryForUser } from '@/server/repositories/ncr';
import Link from 'next/link';
import { StatusBadge, SeverityBadge } from '@/components/ui/badges';
import { fmtDate } from '@/lib/utils';
import { NCR } from '@/types/ncr';

function NCRRow({ ncr }: { ncr: NCR }) {
  return (
    <Link
      href={`/ncr/${ncr.id}`}
      className="flex items-center gap-4 px-5 py-4 bg-white border border-stone-200 rounded-lg hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="font-mono text-xs text-emerald-700 font-medium w-28 flex-shrink-0">{ncr.ref}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-800 truncate">{ncr.problem}</div>
        <div className="text-xs text-stone-400 mt-0.5">
          {ncr.createdByName} · {fmtDate(ncr.createdAt)} · {ncr.department}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <SeverityBadge severity={ncr.severity} />
        <StatusBadge status={ncr.status} />
      </div>
    </Link>
  );
}

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as any).id as string;
  const [inbox, history] = await Promise.all([
    getInboxForUser(userId),
    getHistoryForUser(userId),
  ]);

  // History excludes items already in inbox
  const inboxIds = new Set(inbox.map((n) => n.id));
  const historyOnly = history.filter((n) => !inboxIds.has(n.id));

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Inbox */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Inbox</h1>
            <p className="text-sm text-stone-400">{inbox.length} awaiting your action</p>
          </div>
        </div>
        {inbox.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <div className="text-3xl mb-3">📭</div>
            <div className="text-sm font-medium text-stone-500">All clear</div>
            <div className="text-xs mt-1">Nothing requires your action right now</div>
          </div>
        ) : (
          <div className="space-y-2">
            {inbox.map((ncr) => <NCRRow key={ncr.id} ncr={ncr} />)}
          </div>
        )}
      </div>

      {/* History */}
      {historyOnly.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-widest">History</h2>
          </div>
          <div className="space-y-2">
            {historyOnly.map((ncr) => <NCRRow key={ncr.id} ncr={ncr} />)}
          </div>
        </div>
      )}
    </div>
  );
}
