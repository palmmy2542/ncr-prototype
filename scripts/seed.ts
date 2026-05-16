/**
 * Run once to seed Firestore with test users.
 * Usage: npx ts-node --project tsconfig.json scripts/seed.ts
 *
 * Set env vars first:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

const TEST_USERS = [
  { name: 'Alice Foreman', email: 'alice@company.com', roles: ['FOREMAN'] },
  { name: 'Bob Headley', email: 'bob@company.com', roles: ['FOREMAN_HEAD'] },
  { name: 'Carol PM', email: 'carol@company.com', roles: ['PM'] },
  { name: 'David AMD', email: 'david@company.com', roles: ['AMD'] },
  { name: 'Eve Worker', email: 'eve@company.com', roles: ['WORKER'] },
  { name: 'Frank Worker', email: 'frank@company.com', roles: ['WORKER'] },
  { name: 'Admin User', email: 'admin@company.com', roles: ['ADMIN'] },
];

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  console.log('Seeding users...');
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  for (const u of TEST_USERS) {
    const existing = await db
      .collection('users')
      .where('email', '==', u.email)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`  ⚠ Skipping ${u.email} (already exists)`);
      continue;
    }

    const ref = db.collection('users').doc();
    await ref.set({
      name: u.name,
      email: u.email,
      roles: u.roles,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    });
    console.log(`  ✓ Created ${u.email}`);
  }

  console.log('\nAll test users seeded.');
  console.log(`Password for all users: ${DEFAULT_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
