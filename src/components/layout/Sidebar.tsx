'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { SafeUser } from '@/types/ncr';
import { initials } from '@/lib/utils';

interface Props { user: SafeUser }

export default function Sidebar({ user }: Props) {
  const path = usePathname();
  const isAdmin = user.roles.includes('ADMIN');

  function navClass(href: string) {
    const active = path.startsWith(href);
    return `flex items-center gap-2.5 px-4 py-2 text-sm rounded-md transition-colors ${
      active
        ? 'bg-emerald-50 text-emerald-800 font-medium border-l-2 border-emerald-700'
        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
    }`;
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-stone-100">
        <div className="font-mono text-xs font-medium text-emerald-700 tracking-widest">NCR//SYSTEM</div>
        <div className="text-xs text-stone-400 mt-0.5">Non-Conformance Reports</div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center font-mono flex-shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-stone-800 truncate">{user.name}</div>
            <div className="text-xs text-stone-400 truncate">{user.roles.join(', ')}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <Link href="/inbox" className={navClass('/inbox')}>
          <span>◈</span> My NCRs
        </Link>
        <Link href="/ncr/new" className={navClass('/ncr/new')}>
          <span>+</span> New NCR
        </Link>
        {isAdmin && (
          <>
            <div className="pt-2 pb-1 px-2">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-widest">Admin</div>
            </div>
            <Link href="/admin" className={navClass('/admin')}>
              <span>⚙</span> Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-stone-100">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-xs font-mono text-stone-400 hover:text-stone-700 px-2 py-1.5 rounded transition-colors hover:bg-stone-50"
        >
          ⇄ Sign out
        </button>
      </div>
    </aside>
  );
}
