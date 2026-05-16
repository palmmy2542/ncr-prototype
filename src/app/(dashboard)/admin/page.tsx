import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllNCRs, getAllUsers } from '@/server/repositories/ncr';
import { StatusBadge } from '@/components/ui/badges';
import AdminReassign from '@/components/layout/AdminReassign';
import Link from 'next/link';
import { NCR } from '@/types/ncr';
import { fmtDate } from '@/lib/utils';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const roles = (session.user as any).roles as string[];
  if (!roles.includes('ADMIN')) redirect('/inbox');

  const [ncrs, users] = await Promise.all([getAllNCRs(), getAllUsers()]);
  const assignable = ncrs.filter((n) =>
    ['PENDING_1', 'PENDING_2', 'AMD_REVIEW'].includes(n.status)
  );

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-stone-900">Admin Panel</h1>
        <p className="text-sm text-stone-400 mt-0.5">System management</p>
      </div>

      <AdminReassign assignableNCRs={assignable} users={users} />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500">
            All NCRs ({ncrs.length})
          </h2>
        </div>
        <div className="space-y-2">
          {ncrs.map((ncr) => (
            <Link
              key={ncr.id}
              href={`/ncr/${ncr.id}`}
              className="flex items-center gap-4 px-5 py-3 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-all text-sm"
            >
              <span className="font-mono text-xs text-emerald-700 w-28 flex-shrink-0">{ncr.ref}</span>
              <span className="flex-1 truncate text-stone-700">{ncr.problem}</span>
              <span className="text-xs text-stone-400 flex-shrink-0">{fmtDate(ncr.createdAt)}</span>
              <StatusBadge status={ncr.status} />
            </Link>
          ))}
          {ncrs.length === 0 && (
            <div className="text-center py-8 text-stone-400 text-sm">No NCRs yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
