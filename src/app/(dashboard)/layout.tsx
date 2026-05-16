import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as any;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <Sidebar user={{ id: user.id, name: user.name, email: user.email, roles: user.roles }} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
