import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNCR, getNextRef, getUserById, getAllUsers, getInboxForUser, getHistoryForUser } from '@/server/repositories/ncr';
import { CreateNCRSchema } from '@/lib/validators';
import { now } from '@/lib/utils';
import { NCR } from '@/types/ncr';

function session401() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return session401();

  const userId = (sess.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') ?? 'inbox';
  const roles: string[] = (sess.user as any).roles ?? [];

  if (view === 'all' && !roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let ncrs: NCR[] = [];
  if (view === 'inbox') ncrs = await getInboxForUser(userId);
  else if (view === 'history') ncrs = await getHistoryForUser(userId);
  else if (view === 'all') {
    const { getAllNCRs } = await import('@/server/repositories/ncr');
    ncrs = await getAllNCRs();
  }

  return NextResponse.json({ ncrs });
}

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions);
  if (!sess?.user) return session401();

  const user = sess.user as any;
  const body = await req.json();
  const parsed = CreateNCRSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { problem, severity, department, approver1, submitNow } = parsed.data;

  // Lookup approver to snapshot name
  const approverUser = await getUserById(approver1);
  if (!approverUser) {
    return NextResponse.json({ error: 'Approver 1 not found.' }, { status: 400 });
  }

  const ref = await getNextRef();
  const timestamp = now();

  const ncrData: Omit<NCR, 'id'> = {
    ref,
    status: submitNow ? 'PENDING_1' : 'DRAFT',
    problem,
    severity,
    department,
    createdBy: user.id,
    createdByName: user.name,
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: null,
    steps: submitNow
      ? [
          {
            stepNumber: 1,
            assignedUserId: approverUser.id,
            assignedUserName: approverUser.name,
            action: null,
            comment: null,
            actedAt: null,
          },
        ]
      : [],
    workers: [],
    history: [
      {
        at: timestamp,
        actorId: user.id,
        actorName: user.name,
        action: submitNow ? 'Submitted' : 'Created as Draft',
        comment: null,
      },
    ],
    participantIds: submitNow ? [user.id, approverUser.id] : [user.id],
  };

  const ncr = await createNCR(ncrData);
  return NextResponse.json({ ncr }, { status: 201 });
}
