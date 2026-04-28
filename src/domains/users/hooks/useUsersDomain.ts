import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { auth, createUserWithEmailAndPassword, db, doc, secondaryAuth, serverTimestamp, signOut, updateDoc } from '../../../firebase';
import { logDailyAuditEvent } from '../../../services/repositories/auditLogsRepo';
import { createCeoAdminAlert } from '../../../services/repositories/appAlertsRepo';
import { deleteUserProfile, reserveNextSellerId, saveUserProfile } from '../../../services/repositories/usersRepo';
import type { UserProfile } from '../../../types/users';
import { USERS_DOMAIN_SPEC, canExecuteUsersAction } from '../domainSpec';

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface UseUsersDomainParams {
  users: UserProfile[];
  userRole?: string;
  currentUserEmail?: string;
  currentUserProfile?: UserProfile | null;
  editingUser: UserProfile | null;
  setEditingUser: (value: UserProfile | null) => void;
  setShowUserModal: (value: boolean) => void;
  setUsers: Dispatch<SetStateAction<UserProfile[]>>;
  setUserProfile: (value: UserProfile) => void;
  setConfirmModal: Dispatch<SetStateAction<ConfirmModalState>>;
  onDeleteError: (error: unknown, path: string) => void;
}

export function useUsersDomain({
  users,
  userRole,
  currentUserEmail,
  currentUserProfile,
  editingUser,
  setEditingUser,
  setShowUserModal,
  setUsers,
  setUserProfile,
  setConfirmModal,
  onDeleteError,
}: UseUsersDomainParams) {
  const [selectedManageUserEmail, setSelectedManageUserEmail] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  const upsertUserLocally = (nextUser: UserProfile) => {
    const normalizedEmail = String(nextUser.email || '').toLowerCase();
    if (!normalizedEmail) return;

    setUsers((currentUsers) => {
      let replaced = false;
      const nextUsers = currentUsers.map((userItem) => {
        if (String(userItem.email || '').toLowerCase() !== normalizedEmail) {
          return userItem;
        }
        replaced = true;
        return { ...userItem, ...nextUser };
      });

      return replaced ? nextUsers : [nextUser, ...nextUsers];
    });
  };

  const saveUser = async (userProfileData: UserProfile, password?: string) => {
    const action = editingUser ? 'editUser' : 'createUser';
    if (!canExecuteUsersAction(userRole, action)) {
      toast.error(USERS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    const rawEmail = userProfileData.email.toLowerCase();
    const authEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@chancepro.local`;
    const normalizedRole = (userRole || '').toLowerCase();
    const targetRole = (userProfileData.role || '').toLowerCase();
    const actorUid = auth.currentUser?.uid || '';
    const actorEmail = (currentUserEmail || auth.currentUser?.email || '').toLowerCase();
    const actorSellerId = currentUserProfile?.sellerId || '';

    const wasCreatedByCurrentActor = (targetUser: UserProfile | null) => {
      if (!targetUser) return false;
      const createdByEmail = String((targetUser as any).createdByEmail || '').toLowerCase();
      const createdBySellerId = String((targetUser as any).createdBySellerId || '').toLowerCase();
      const createdByUid = String((targetUser as any).createdBy || '');

      return (
        (!!createdByEmail && !!actorEmail && createdByEmail === actorEmail) ||
        (!!createdBySellerId && !!actorSellerId && createdBySellerId === actorSellerId.toLowerCase()) ||
        (!!createdByUid && !!actorUid && createdByUid === actorUid)
      );
    };

    if (normalizedRole === 'admin' && targetRole !== 'seller') {
      toast.error('Admin solo puede gestionar usuarios vendedor');
      return;
    }

    if (normalizedRole === 'admin' && editingUser && editingUser.role !== 'seller') {
      toast.error('Admin solo puede editar perfiles vendedor');
      return;
    }

    if (normalizedRole === 'admin' && editingUser && !wasCreatedByCurrentActor(editingUser)) {
      toast.error('Admin solo puede editar usuarios creados por el mismo');
      return;
    }

    if (userProfileData.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.email !== authEmail).length;
      if (adminCount >= 10) {
        toast.error('Limite maximo de 10 administradores alcanzado');
        return;
      }
    }

    if (userProfileData.role === 'ceo') {
      const ceoCount = users.filter(u => u.role === 'ceo' && u.email !== authEmail).length;
      if (ceoCount >= 4) {
        toast.error('Limite maximo de 4 CEO alcanzado');
        return;
      }
    }

    const buildPermissionDeniedMessage = (targetEmail: string) => {
      const normalizedTarget = targetEmail.toLowerCase();
      const normalizedCurrent = (currentUserEmail || '').toLowerCase();
      const isSelfUpdate = action === 'editUser' && normalizedTarget === normalizedCurrent;
      const isCommissionUpdate = action === 'editUser'
        && editingUser != null
        && Number(editingUser.commissionRate || 0) !== Number(userProfileData.commissionRate || 0);

      if (isSelfUpdate && isCommissionUpdate) {
        return `Permiso insuficiente para actualizar tu propia comisión en users/${normalizedTarget}. Revisa reglas: ownerProfileUpdateIsSafe/canManageUserUpdate.`;
      }

      if (isSelfUpdate) {
        return `Permiso insuficiente para actualizar tu propio perfil en users/${normalizedTarget}. Revisa reglas: ownerProfileUpdateIsSafe.`;
      }

      return `Permiso insuficiente para ${action === 'createUser' ? 'crear' : 'actualizar'} users/${normalizedTarget}. Verifica permisos de rol en reglas Firestore.`;
    };

    setIsSavingUser(true);

    try {
      if (!userProfileData.sellerId) {
        const newSellerId = await reserveNextSellerId(userProfileData.role);
        userProfileData.sellerId = newSellerId;
        userProfileData.name = newSellerId;
      }

      if (password) {
        if (!secondaryAuth) {
          throw new Error('Servicio de autenticacion secundaria no disponible');
        }
        try {
          await signOut(secondaryAuth).catch(() => undefined);
          await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            toast.info('El usuario ya existe en el sistema. Actualizando su perfil...');
          } else {
            throw authError;
          }
        } finally {
          await signOut(secondaryAuth).catch(() => undefined);
        }
        userProfileData.email = authEmail;
      } else if (!userProfileData.email.includes('@')) {
        userProfileData.email = authEmail;
      }

      if (editingUser?.preferredChancePrice !== undefined && userProfileData.preferredChancePrice === undefined) {
        userProfileData.preferredChancePrice = editingUser.preferredChancePrice;
      }

      const normalizedFirestoreEmail = (userProfileData.email || authEmail).toLowerCase();
      const normalizedCurrentUserEmail = (currentUserEmail || '').toLowerCase();
      const isSelfEdit = Boolean(
        editingUser && normalizedCurrentUserEmail !== '' && normalizedCurrentUserEmail === normalizedFirestoreEmail
      );
      userProfileData.email = normalizedFirestoreEmail;
      const cleanData = Object.fromEntries(
        Object.entries(userProfileData).filter(([_, v]) => v !== undefined)
      ) as Record<string, unknown>;
      const previousUserData = editingUser ? { ...editingUser } : null;

      // Preserve immutable primary-ceo marker when editing an existing doc.
      if (editingUser && (editingUser as any).isPrimaryCeo !== undefined && cleanData.isPrimaryCeo === undefined) {
        cleanData.isPrimaryCeo = Boolean((editingUser as any).isPrimaryCeo);
      }

      if (editingUser) {
        cleanData.createdBy = (editingUser as any).createdBy || cleanData.createdBy || '';
        cleanData.createdByEmail = String((editingUser as any).createdByEmail || cleanData.createdByEmail || '').toLowerCase();
        cleanData.createdByRole = (editingUser as any).createdByRole || cleanData.createdByRole || '';
        cleanData.createdBySellerId = (editingUser as any).createdBySellerId || cleanData.createdBySellerId || '';
        if ((editingUser as any).createdAt !== undefined) {
          cleanData.createdAt = (editingUser as any).createdAt;
        }
      } else {
        cleanData.createdBy = actorUid;
        cleanData.createdByEmail = actorEmail;
        cleanData.createdByRole = normalizedRole;
        cleanData.createdBySellerId = actorSellerId;
        cleanData.createdAt = serverTimestamp();
      }

      cleanData.updatedBy = actorUid;
      cleanData.updatedByEmail = actorEmail;
      cleanData.updatedByRole = normalizedRole;
      cleanData.updatedBySellerId = actorSellerId;
      cleanData.updatedAt = serverTimestamp();

      const selfUpdatePayload = isSelfEdit
        ? {
            name: String(cleanData.name || '').trim(),
            commissionRate: Number.isFinite(Number(cleanData.commissionRate)) ? Number(cleanData.commissionRate) : 0,
            updatedAt: serverTimestamp(),
            updatedBy: actorUid,
            updatedByEmail: normalizedCurrentUserEmail || actorEmail,
            updatedByRole: normalizedRole,
            updatedBySellerId: actorSellerId,
          }
        : null;

      console.log('[saveUser debug]', {
        mode: editingUser ? 'edit' : 'create',
        authEmail: auth.currentUser?.email,
        authUid: auth.currentUser?.uid,
        currentUserProfile,
        targetEmail: normalizedFirestoreEmail,
        payload: isSelfEdit ? selfUpdatePayload : cleanData,
      });
      console.log('[saveUser FULL PAYLOAD]', JSON.stringify(isSelfEdit ? selfUpdatePayload : cleanData, null, 2));
      console.log('[saveUser KEYS]', Object.keys(isSelfEdit ? (selfUpdatePayload || {}) : cleanData));

      try {
        if (isSelfEdit && selfUpdatePayload) {
          await updateDoc(doc(db, 'users', normalizedFirestoreEmail), selfUpdatePayload);
        } else {
          await saveUserProfile(normalizedFirestoreEmail, cleanData);
        }
      } catch (error) {
        const typedError = error as any;
        console.error('[FIRESTORE ERROR CODE]', typedError?.code);
        console.error('[FIRESTORE ERROR MESSAGE]', typedError?.message);
        console.error('[FIRESTORE FULL ERROR]', typedError);
        console.error('[saveUser users write failed]', {
          path: `users/${normalizedFirestoreEmail}`,
          error,
        });
        throw error;
      }

      if (editingUser?.email?.toLowerCase() === currentUserEmail?.toLowerCase()) {
        if (isSelfEdit && selfUpdatePayload) {
          setUserProfile({
            ...(currentUserProfile || editingUser || ({} as UserProfile)),
            name: String(selfUpdatePayload.name || ''),
            commissionRate: Number(selfUpdatePayload.commissionRate || 0),
          } as UserProfile);
        } else {
          setUserProfile(cleanData as unknown as UserProfile);
        }
      }

      const optimisticUser = {
        ...(editingUser || {}),
        ...(isSelfEdit && selfUpdatePayload
          ? {
              name: String(selfUpdatePayload.name || ''),
              commissionRate: Number(selfUpdatePayload.commissionRate || 0),
            }
          : cleanData),
        email: normalizedFirestoreEmail,
      } as UserProfile;
      upsertUserLocally(optimisticUser);
      toast.success(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      setShowUserModal(false);
      setEditingUser(null);
      setIsSavingUser(false);

      if (normalizedRole === 'ceo' || normalizedRole === 'admin') {
        await logDailyAuditEvent({
          type: editingUser ? 'USER_UPDATED' : 'USER_CREATED',
          actor: {
            email: currentUserEmail,
            sellerId: currentUserProfile?.sellerId,
            name: currentUserProfile?.name,
            role: normalizedRole,
          },
          target: {
            email: normalizedFirestoreEmail,
            sellerId: String(cleanData.sellerId || ''),
            name: String(cleanData.name || ''),
          },
          details: {
            updatedFields: Object.keys(cleanData),
            targetRole: cleanData.role,
          },
        }).catch((error) => {
          console.error('Daily audit log failed (users save):', error);
        });
      }

      if (normalizedRole === 'admin' || normalizedRole === 'ceo') {
        const alertType = `${normalizedRole}_${editingUser ? 'user_updated' : 'user_created'}`;
        const actionLabel = editingUser ? 'actualizo' : 'creo';
        const targetUsername = normalizedFirestoreEmail.split('@')[0] || normalizedFirestoreEmail;
        await createCeoAdminAlert({
          type: alertType,
          priority: 70,
          title: editingUser ? 'Usuario editado' : 'Usuario creado',
          message: `${currentUserProfile?.name || actorEmail || normalizedRole.toUpperCase()} ${actionLabel} usuario ${String(cleanData.name || targetUsername)} (${targetUsername}) con rol ${String(cleanData.role || 'seller')} y comision ${Number(cleanData.commissionRate || 0).toFixed(2)}%.`,
          createdByEmail: actorEmail,
          createdByRole: normalizedRole,
          metadata: {
            actorName: currentUserProfile?.name || '',
            actorSellerId: currentUserProfile?.sellerId || '',
            actorRole: normalizedRole,
            targetEmail: normalizedFirestoreEmail,
            targetUsername,
            targetName: String(cleanData.name || ''),
            targetSellerId: String(cleanData.sellerId || ''),
            targetRole: String(cleanData.role || ''),
            commissionRate: Number(cleanData.commissionRate || 0),
            updatedFields: Object.keys(cleanData),
            previousRole: previousUserData?.role || '',
            previousCommissionRate: Number(previousUserData?.commissionRate || 0),
            nextRole: String(cleanData.role || ''),
            nextCommissionRate: Number(cleanData.commissionRate || 0),
          },
          actionRef: `users/${normalizedFirestoreEmail}`,
        }).catch((error) => {
          console.error('App alert failed (users save):', error);
        });
      }
    } catch (error: any) {
      const firebaseCode = error?.code || 'unknown';
      const targetEmail = (userProfileData.email || authEmail || '').toLowerCase();

      if (error.code === 'auth/email-already-in-use') {
        toast.error('El usuario ya existe');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('El formato del usuario es invalido');
      } else if (error.code === 'auth/weak-password') {
        toast.error('La contrasena es muy debil');
      } else if (error.code === 'auth/admin-restricted-operation') {
        toast.error('Registro de usuarios restringido en Firebase Authentication');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('El registro de usuarios no esta habilitado en Firebase');
      } else if (firebaseCode === 'permission-denied') {
        toast.error(buildPermissionDeniedMessage(targetEmail));
      } else {
        toast.error(`Error: ${error.message || 'No se pudo guardar el usuario'}`);
      }

      console.error('Users save error', {
        code: firebaseCode,
        action,
        role: userRole,
        currentUserEmail: currentUserEmail || '',
        targetPath: `users/${targetEmail}`,
        message: error?.message || '',
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const deleteUser = async (email: string) => {
    if (!canExecuteUsersAction(userRole, 'deleteUser')) {
      toast.error(USERS_DOMAIN_SPEC.expectedErrors.unauthorizedAction);
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Eliminar Usuario',
      message: 'Esta seguro de eliminar este usuario? Perdera acceso al sistema.',
      onConfirm: async () => {
        try {
          await deleteUserProfile(email);
          setUsers((currentUsers) => currentUsers.filter((userItem) => String(userItem.email || '').toLowerCase() !== email.toLowerCase()));
          toast.success('Usuario eliminado correctamente');
        } catch (error) {
          onDeleteError(error, `users/${email}`);
        }
      },
    });
  };

  return {
    selectedManageUserEmail,
    setSelectedManageUserEmail,
    saveUser,
    deleteUser,
    isSavingUser,
  };
}
