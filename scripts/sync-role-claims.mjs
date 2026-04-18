import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const VALID_ROLES = new Set(['ceo', 'admin', 'seller', 'programador']);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function readJsonFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function buildClaims(role, isPrimary = false, existingClaims = {}) {
  const merged = { ...existingClaims, role };
  if (role === 'ceo') {
    merged.isPrimaryCeo = !!isPrimary;
  } else if (Object.prototype.hasOwnProperty.call(merged, 'isPrimaryCeo')) {
    delete merged.isPrimaryCeo;
  }
  return merged;
}

function areClaimsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function setSingleUserClaim(auth, email, role, isPrimaryCeo) {
  const user = await auth.getUserByEmail(email);
  const nextClaims = buildClaims(role, isPrimaryCeo, user.customClaims || {});
  if (areClaimsEqual(user.customClaims || {}, nextClaims)) {
    return { updated: false, uid: user.uid, email, role };
  }
  await auth.setCustomUserClaims(user.uid, nextClaims);
  return { updated: true, uid: user.uid, email, role };
}

async function syncClaimsFromUsersCollection(auth, db) {
  const snap = await db.collection('users').get();
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const failed = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const email = normalizeEmail(data.email || docSnap.id);
    const role = String(data.role || '').trim().toLowerCase();
    const isPrimaryCeo = !!data.isPrimary;

    if (!email || !VALID_ROLES.has(role)) {
      skipped += 1;
      continue;
    }

    try {
      const user = await auth.getUserByEmail(email);
      const nextClaims = buildClaims(role, isPrimaryCeo, user.customClaims || {});

      if (areClaimsEqual(user.customClaims || {}, nextClaims)) {
        unchanged += 1;
        continue;
      }

      await auth.setCustomUserClaims(user.uid, nextClaims);
      updated += 1;
      console.log(`UPDATED ${email} (${user.uid}) => role=${role}`);
    } catch (error) {
      failed.push({
        email,
        role,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { totalDocs: snap.size, updated, unchanged, skipped, failed };
}

async function main() {
  const serviceAccountPath = requiredEnv('TARGET_SERVICE_ACCOUNT_PATH');
  const serviceAccount = readJsonFile(serviceAccountPath);

  const app = initializeApp(
    {
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    },
    `claims-sync-${Date.now()}`
  );

  const auth = getAuth(app);
  const db = getFirestore(app);

  const userEmail = normalizeEmail(process.env.USER_EMAIL || '');
  const userRole = String(process.env.USER_ROLE || '').trim().toLowerCase();
  const isPrimaryCeo = String(process.env.IS_PRIMARY_CEO || 'false').toLowerCase() === 'true';

  try {
    if (userEmail) {
      if (!VALID_ROLES.has(userRole)) {
        throw new Error('USER_ROLE must be one of: ceo, admin, seller, programador when USER_EMAIL is set.');
      }

      const result = await setSingleUserClaim(auth, userEmail, userRole, isPrimaryCeo);
      if (result.updated) {
        console.log(`UPDATED ${result.email} (${result.uid}) => role=${result.role}`);
      } else {
        console.log(`UNCHANGED ${result.email} (${result.uid}) => role=${result.role}`);
      }
      return;
    }

    const result = await syncClaimsFromUsersCollection(auth, db);
    console.log('\n=== ROLE CLAIMS SYNC SUMMARY ===');
    console.log(`Users docs scanned: ${result.totalDocs}`);
    console.log(`Claims updated: ${result.updated}`);
    console.log(`Claims unchanged: ${result.unchanged}`);
    console.log(`Docs skipped: ${result.skipped}`);
    console.log(`Errors: ${result.failed.length}`);

    if (result.failed.length > 0) {
      for (const item of result.failed) {
        console.error(`FAILED ${item.email} (${item.role}) => ${item.error}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error('Role claims sync failed.');
  console.error(error);
  process.exit(1);
});
