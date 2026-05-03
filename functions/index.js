const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

initializeApp();

const auth = getAuth();
const db = getFirestore();

const REGION = 'us-central1';
const LOCAL_AUTH_DOMAIN = 'chancepro.local';
const OWNER_EMAIL = 'zsayeth09@gmail.com';
const OWNER_SELLER_ID = 'ceo01';
const VALID_ROLES = new Set(['ceo', 'admin', 'seller']);
const VALID_STATUSES = new Set(['active', 'inactive']);

function normalizeEmail(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\s/g, '');
  if (!raw) {
    throw new HttpsError('invalid-argument', 'El usuario o email es requerido.');
  }
  return raw.includes('@') ? raw : `${raw}@${LOCAL_AUTH_DOMAIN}`;
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (!VALID_ROLES.has(role)) {
    throw new HttpsError('invalid-argument', 'Rol de usuario invalido.');
  }
  return role;
}

function normalizeStatus(value) {
  const status = String(value || 'active').trim().toLowerCase();
  if (!VALID_STATUSES.has(status)) {
    throw new HttpsError('invalid-argument', 'Estado de usuario invalido.');
  }
  return status;
}

function normalizeCommissionRate(value) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 100) {
    throw new HttpsError('invalid-argument', 'Comision invalida.');
  }
  return numberValue;
}

function normalizePassword(value) {
  const password = String(value || '');
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contrasena debe tener al menos 6 caracteres.');
  }
  return password;
}

function rolePrefix(role) {
  if (role === 'ceo') return 'CEO';
  if (role === 'admin') return 'ADM';
  return 'VEND';
}

function compactProfile(profile) {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined)
  );
}

function buildClaims(profile, existingClaims = {}) {
  const role = normalizeRole(profile.role);
  const claims = {
    ...existingClaims,
    role,
    status: normalizeStatus(profile.status),
  };

  const sellerId = String(profile.sellerId || '').trim().toLowerCase();
  if (sellerId) {
    claims.sellerId = sellerId;
  } else {
    delete claims.sellerId;
  }

  if (role === 'ceo') {
    claims.isPrimaryCeo = profile.isPrimaryCeo === true;
  } else {
    delete claims.isPrimaryCeo;
  }

  return claims;
}

async function setClaimsForProfile(email, profile) {
  const userRecord = await auth.getUserByEmail(email);
  const claims = buildClaims(profile, userRecord.customClaims || {});
  const displayName = String(profile.name || profile.sellerId || '').trim();
  await auth.updateUser(userRecord.uid, compactProfile({
    displayName: displayName || undefined,
    disabled: normalizeStatus(profile.status) === 'inactive',
  }));
  await auth.setCustomUserClaims(userRecord.uid, claims);
  return { uid: userRecord.uid, claims };
}

async function getActor(authContext) {
  const actorEmail = String(authContext.token.email || '').trim().toLowerCase();
  if (!actorEmail) {
    throw new HttpsError('permission-denied', 'Tu cuenta no tiene email verificado para operar usuarios.');
  }

  const actorDoc = await db.doc(`users/${actorEmail}`).get();
  const actorData = actorDoc.exists ? actorDoc.data() || {} : {};
  const actorRole = String(actorData.role || authContext.token.role || '').trim().toLowerCase();
  const actorStatus = String(actorData.status || authContext.token.status || 'active').trim().toLowerCase();
  const actorSellerId = String(actorData.sellerId || authContext.token.sellerId || '').trim();
  const isOwner = actorEmail === OWNER_EMAIL ||
    actorData.isPrimaryCeo === true ||
    authContext.token.isPrimaryCeo === true ||
    actorSellerId.toLowerCase() === OWNER_SELLER_ID;

  if (!isOwner && actorStatus === 'inactive') {
    throw new HttpsError('permission-denied', 'Tu usuario esta inactivo.');
  }

  if (!isOwner && actorRole !== 'ceo' && actorRole !== 'admin') {
    throw new HttpsError('permission-denied', 'No tienes permisos para crear usuarios.');
  }

  return {
    uid: authContext.uid,
    email: actorEmail,
    role: isOwner ? 'ceo' : actorRole,
    sellerId: actorSellerId,
    isOwner,
  };
}

function assertCanProvision(actor, targetEmail, targetRole) {
  if (targetEmail === OWNER_EMAIL && !actor.isOwner) {
    throw new HttpsError('permission-denied', 'El owner solo puede ser administrado por el owner.');
  }

  if (actor.isOwner) return;

  if (actor.role === 'ceo') {
    if (targetRole === 'ceo') {
      throw new HttpsError('permission-denied', 'Solo el owner puede crear otros perfiles CEO.');
    }
    return;
  }

  if (actor.role === 'admin' && targetRole === 'seller') return;

  throw new HttpsError('permission-denied', 'Tu rol no puede crear ese tipo de usuario.');
}

async function upsertAuthUser(email, password, status) {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      password,
      disabled: status === 'inactive',
    });
    return { uid: existing.uid, existed: true };
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    const created = await auth.createUser({
      email,
      password,
      disabled: status === 'inactive',
    });
    return { uid: created.uid, existed: false };
  }
}

exports.provisionUser = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesion para crear usuarios.');
  }

  const payload = request.data || {};
  const email = normalizeEmail(payload.email);
  const role = normalizeRole(payload.role);
  const status = normalizeStatus(payload.status);
  const password = normalizePassword(payload.password);
  const commissionRate = normalizeCommissionRate(payload.commissionRate);
  const actor = await getActor(request.auth);

  assertCanProvision(actor, email, role);

  const userRef = db.doc(`users/${email}`);
  const existingProfileSnap = await userRef.get();
  if (existingProfileSnap.exists) {
    throw new HttpsError(
      'already-exists',
      'Ese usuario ya existe en la base de datos. Abrelo desde la lista y usa editar.'
    );
  }

  const authResult = await upsertAuthUser(email, password, status);
  const settingsRef = db.doc('settings/global');
  let savedProfile = null;

  await db.runTransaction(async (transaction) => {
    const [userSnap, settingsSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(settingsRef),
    ]);
    if (userSnap.exists) {
      throw new HttpsError(
        'already-exists',
        'Ese usuario ya existe en la base de datos. Abrelo desde la lista y usa editar.'
      );
    }

    const shouldGenerateSellerId = !String(payload.sellerId || '').trim();
    const nextSellerNumber = Number(settingsSnap.exists ? settingsSnap.data().nextSellerNumber || 1 : 1);
    const sellerId = shouldGenerateSellerId
      ? `${rolePrefix(role)}${String(nextSellerNumber).padStart(2, '0')}`
      : String(payload.sellerId).trim();
    const requestedName = String(payload.name || '').trim();
    const name = requestedName || sellerId;
    const now = FieldValue.serverTimestamp();

    savedProfile = compactProfile({
      email,
      name,
      role,
      status,
      commissionRate,
      canLiquidate: role === 'admin' ? payload.canLiquidate === true : role === 'ceo',
      currentDebt: Number(payload.currentDebt || 0),
      sellerId,
      isPrimaryCeo: false,
      createdBy: actor.uid,
      createdByEmail: actor.email.toLowerCase(),
      createdByRole: actor.role,
      createdBySellerId: actor.sellerId || '',
      createdAt: now,
      updatedBy: actor.uid,
      updatedByEmail: actor.email,
      updatedByRole: actor.role,
      updatedBySellerId: actor.sellerId || '',
      updatedAt: now,
    });

    transaction.create(userRef, savedProfile);

    if (shouldGenerateSellerId) {
      transaction.set(settingsRef, { nextSellerNumber: nextSellerNumber + 1 }, { merge: true });
    }
  });

  await auth.updateUser(authResult.uid, {
    displayName: savedProfile.name,
    disabled: status === 'inactive',
  });
  const claimsResult = await setClaimsForProfile(email, savedProfile);

  logger.info('User provisioned', {
    email,
    role,
    actorEmail: actor.email,
    authUserExisted: authResult.existed,
  });

  return {
    user: {
      ...savedProfile,
      createdAt: undefined,
      updatedAt: undefined,
    },
    uid: authResult.uid,
    claims: claimsResult.claims,
    authUserExisted: authResult.existed,
  };
});

exports.syncUserClaims = onDocumentWritten({ region: REGION, document: 'users/{email}' }, async (event) => {
  const email = String(event.params.email || '').toLowerCase();
  if (!email) return;

  if (!event.data.after.exists) {
    if (email === OWNER_EMAIL) return;

    try {
      const userRecord = await auth.getUserByEmail(email);
      const nextClaims = { ...(userRecord.customClaims || {}), status: 'inactive' };
      delete nextClaims.role;
      delete nextClaims.sellerId;
      delete nextClaims.isPrimaryCeo;
      await auth.setCustomUserClaims(userRecord.uid, nextClaims);
      logger.info('Claims cleared after user profile deletion', { email });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        logger.error('Failed clearing claims after profile deletion', { email, error });
      }
    }
    return;
  }

  const profile = event.data.after.data() || {};
  const profileEmail = normalizeEmail(profile.email || email);
  if (!VALID_ROLES.has(String(profile.role || '').toLowerCase())) return;

  try {
    const result = await setClaimsForProfile(profileEmail, {
      ...profile,
      email: profileEmail,
    });
    logger.info('Claims synced from user profile', {
      email: profileEmail,
      uid: result.uid,
      role: profile.role,
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      logger.warn('User profile has no Auth account yet; claims sync skipped', { email: profileEmail });
      return;
    }
    logger.error('Failed syncing user claims', { email: profileEmail, error });
    throw error;
  }
});
