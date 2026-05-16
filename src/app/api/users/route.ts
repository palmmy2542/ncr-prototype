import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllUsers, getNCRById, updateNCR, getUserById } from '@/server/repositories/ncr';
import { ReassignSchema } from '@/lib/validators';
import { now } from '@/lib/utils';
import { NCRStatus } from '@/types/ncr';

export async function GET() {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles: string[] = (sess.user as any).roles ?? [];
  if (!roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ReassignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ncrId, newUserId } = parsed.data;
  const ncr = await getNCRById(ncrId);
  if (!ncr) return NextResponse.json({ error: 'NCR not found' }, { status: 404 });

  const stepMap: Partial<Record<NCRStatus, number>> = {
    PENDING_1: 1,
    PENDING_2: 2,
    AMD_REVIEW: 3,
  };
  const stepNum = stepMap[ncr.status];
  if (!stepNum) {
    return NextResponse.json({ error: 'NCR is not in a reassignable state.' }, { status: 400 });
  }

  const newUser = await getUserById(newUserId);
  if (!newUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const steps = ncr.steps.map((s) =>
    s.stepNumber === stepNum
      ? { ...s, assignedUserId: newUser.id, assignedUserName: newUser.name }
      : s
  );

  // Rebuild participantIds
  const pSet = new Set<string>([
    ncr.createdBy,
    ...steps.map((s) => s.assignedUserId),
    ...ncr.workers.map((w) => w.userId),
  ]);

  await updateNCR(ncrId, {
    steps,
    participantIds: Array.from(pSet),
    updatedAt: now(),
  });

  return NextResponse.json({ ok: true });
}
