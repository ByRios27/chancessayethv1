import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function readServiceAccount(jsonPath) {
  const absolute = path.resolve(jsonPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Service account file not found: ${absolute}`);
  }
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

async function listAllUsers(auth) {
  const users = [];
  let nextPageToken = undefined;

  do {
    const page = await auth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return users;
}

async function main() {
  const targetCredPath = requiredEnv('TARGET_SERVICE_ACCOUNT_PATH');
  const excludedEmail = (process.env.EXCLUDED_OWNER_EMAIL || 'zsayeth09@gmail.com').trim().toLowerCase();
  const tempPassword = (process.env.TEMP_PASSWORD || '12345').trim();

  if (tempPassword.length < 6) {
    throw new Error('TEMP_PASSWORD must be at least 6 characters for Firebase Auth.');
  }

  const targetServiceAccount = readServiceAccount(targetCredPath);
  const app = initializeApp(
    {
      credential: cert(targetServiceAccount),
      projectId: targetServiceAccount.project_id,
    },
    'auth-maintenance-app'
  );

  const auth = getAuth(app);
  const startedAt = new Date();

  console.log('Starting temporary password reset process');
  console.log(`Project: ${targetServiceAccount.project_id}`);
  console.log(`Excluded owner email: ${excludedEmail}`);
  console.log(`Temporary password length: ${tempPassword.length}`);

  try {
    const allUsers = await listAllUsers(auth);
    console.log(`Total users found in Auth: ${allUsers.length}`);

    const toUpdate = [];
    const skipped = [];

    for (const user of allUsers) {
      const email = (user.email || '').toLowerCase();
      if (email && email === excludedEmail) {
        skipped.push({
          uid: user.uid,
          email: user.email || '(no-email)',
          reason: 'owner-excluded',
        });
        continue;
      }
      toUpdate.push(user);
    }

    console.log(`Users to update: ${toUpdate.length}`);
    console.log(`Users skipped: ${skipped.length}`);

    const updated = [];
    const failed = [];

    for (const user of toUpdate) {
      try {
        await auth.updateUser(user.uid, { password: tempPassword });
        updated.push({
          uid: user.uid,
          email: user.email || '(no-email)',
        });
      } catch (error) {
        failed.push({
          uid: user.uid,
          email: user.email || '(no-email)',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('\n========== TEMP PASSWORD RESET SUMMARY ==========');
    console.log(`Project: ${targetServiceAccount.project_id}`);
    console.log(`Started at: ${startedAt.toISOString()}`);
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log(`Total users found: ${allUsers.length}`);
    console.log(`Updated users: ${updated.length}`);
    console.log(`Skipped users: ${skipped.length}`);
    console.log(`Failed users: ${failed.length}`);

    if (updated.length) {
      console.log('\nUpdated accounts (email | uid):');
      for (const item of updated) {
        console.log(`- ${item.email} | ${item.uid}`);
      }
    }

    if (skipped.length) {
      console.log('\nSkipped accounts (email | uid | reason):');
      for (const item of skipped) {
        console.log(`- ${item.email} | ${item.uid} | ${item.reason}`);
      }
    }

    if (failed.length) {
      console.log('\nFailed accounts (email | uid | error):');
      for (const item of failed) {
        console.log(`- ${item.email} | ${item.uid} | ${item.error}`);
      }
      process.exitCode = 1;
    }

    console.log('=================================================\n');
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error('\nTemporary password reset failed.');
  console.error(error);
  process.exit(1);
});
