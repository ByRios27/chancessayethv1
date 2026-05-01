import { toast } from 'sonner';

import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code: string;
  cause: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const firebaseCode = (error as { code?: string })?.code || 'unknown';
  const firebaseMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: firebaseMessage,
    code: firebaseCode,
    cause: firebaseMessage,
    authInfo: {
      userId: auth.currentUser?.uid || 'no-uid',
      email: auth.currentUser?.email || 'no-email',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || 'no-tenant',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || 'no-display-name',
        email: provider.email || 'no-email',
        photoUrl: provider.photoURL || 'no-photo'
      })) || []
    },
    operationType,
    path
  };

  const operationLabel = ({
    [OperationType.CREATE]: 'crear',
    [OperationType.UPDATE]: 'actualizar',
    [OperationType.DELETE]: 'eliminar',
    [OperationType.LIST]: 'listar',
    [OperationType.GET]: 'leer',
    [OperationType.WRITE]: 'guardar'
  } as Record<OperationType, string>)[operationType];

  const target = path || 'documento';
  const humanHint = firebaseCode === 'permission-denied'
    ? 'No tienes permisos para esta acción.'
    : firebaseCode === 'failed-precondition'
      ? 'Falta un requisito previo para completar la operación.'
      : firebaseCode === 'unavailable'
        ? 'Servicio temporalmente no disponible. Intenta nuevamente.'
        : `Causa: ${firebaseMessage}`;

  toast.error(
    `Error al ${operationLabel} (${target})`,
    {
      description: `Código: ${firebaseCode} | ${humanHint}`
    }
  );

  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  return errInfo;
}
