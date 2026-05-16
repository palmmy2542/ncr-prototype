import { getDb } from '@/lib/firebase-admin';
import { NCR, User, SafeUser } from '@/types/ncr';
import { now, buildRef } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const USERS_COL = 'users';
const NCRS_COL = 'ncrs';
const COUNTERS_COL = 'counters';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const snap = await db
    .collection(USERS_COL)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const db = getDb();
  const doc = await db.collection(USERS_COL).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return { id: doc.id, name: data.name, email: data.email, roles: data.roles };
}

export async function getAllUsers(): Promise<SafeUser[]> {
  const db = getDb();
  const snap = await db.collection(USERS_COL).orderBy('name').get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, name: data.name, email: data.email, roles: data.roles };
  });
}

// ─── NCR ref counter ──────────────────────────────────────────────────────────

export async function getNextRef(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const counterRef = db.collection(COUNTERS_COL).doc(`ncr-${year}`);

  const seq = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const current = doc.exists ? (doc.data()!.seq as number) : 0;
    const next = current + 1;
    tx.set(counterRef, { seq: next });
    return next;
  });

  return buildRef(year, seq);
}

// ─── NCR CRUD ─────────────────────────────────────────────────────────────────

export async function createNCR(data: Omit<NCR, 'id'>): Promise<NCR> {
  const db = getDb();
  const ref = db.collection(NCRS_COL).doc();
  const ncr: NCR = { ...data, id: ref.id };
  await ref.set(ncr);
  return ncr;
}

export async function getNCRById(id: string): Promise<NCR | null> {
  const db = getDb();
  const doc = await db.collection(NCRS_COL).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as NCR;
}

export async function updateNCR(id: string, data: Partial<NCR>): Promise<void> {
  const db = getDb();
  await db.collection(NCRS_COL).doc(id).update({ ...data, updatedAt: now() });
}

export async function updateNCRTransaction(
  id: string,
  updater: (ncr: NCR) => Partial<NCR>
): Promise<NCR> {
  const db = getDb();
  const ref = db.collection(NCRS_COL).doc(id);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error('NCR not found');
    const ncr = { id: doc.id, ...doc.data() } as NCR;
    const updates = updater(ncr);
    tx.update(ref, updates);
    return { ...ncr, ...updates };
  });
}

export async function deleteNCR(id: string): Promise<void> {
  const db = getDb();
  await db.collection(NCRS_COL).doc(id).delete();
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Inbox: NCRs where user is the current assignee and NCR is not closed */
export async function getInboxForUser(userId: string): Promise<NCR[]> {
  const db = getDb();
  const snap = await db
    .collection(NCRS_COL)
    .where('participantIds', 'array-contains', userId)
    .get();

  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NCR);

  // Filter in-memory: current assignee = this user, status != CLOSED
  return all.filter((ncr) => {
    if (ncr.status === 'CLOSED') return false;
    if (ncr.status === 'DRAFT' || ncr.status === 'FOLLOWUP') return ncr.createdBy === userId;
    const stepMap: Record<string, number> = { PENDING_1: 1, PENDING_2: 2, AMD_REVIEW: 3 };
    const num = stepMap[ncr.status];
    return ncr.steps.find((s) => s.stepNumber === num)?.assignedUserId === userId;
  });
}

/** History: all NCRs where user participated */
export async function getHistoryForUser(userId: string): Promise<NCR[]> {
  const db = getDb();
  const snap = await db
    .collection(NCRS_COL)
    .where('participantIds', 'array-contains', userId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NCR);
}

/** Admin: all NCRs */
export async function getAllNCRs(): Promise<NCR[]> {
  const db = getDb();
  const snap = await db.collection(NCRS_COL).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NCR);
}

// ─── Seed (dev only) ──────────────────────────────────────────────────────────

export async function seedUsers(users: Omit<User, 'id'>[]): Promise<void> {
  const db = getDb();
  const batch = db.batch();
  for (const u of users) {
    const ref = db.collection(USERS_COL).doc();
    batch.set(ref, u);
  }
  await batch.commit();
}
