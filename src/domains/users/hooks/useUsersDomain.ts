import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { auth, db, doc, functions, httpsCallable, serverTimestamp, updateDoc } from '../../../firebase';
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
  isPrimaryCeoUser?: boolean;
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
  isPrimaryCeoUser = false,
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
    const editingUserEmail = String(editingUser?.email || '').toLowerCase();
    const requestedUserEmail = String(userProfileData.email || authEmail).toLowerCase();
    const isSelfCeoEdit = Boolean(
      editingUser &&
      actorEmail &&
      (editingUserEmail === actorEmail || requestedUserEmail === actorEmail)
    );

    if ((targetRole === 'ceo' || editingUser?.role === 'ceo') && !isPrimaryCeoUser && !isSelfCeoEdit) {
      toast.error('Solo el CEO Owner puede crear o modificar perfiles CEO');
      return;
    }

    if (!editingUser && normalizedRole === 'admin' && targetRole !== 'seller') {
      toast.error('Los administradores solo pueden crear vendedores');
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
      if (!editingUser) {
        if (!password || password.length < 6) {
          toast.error('La contrasena debe tener al menos 6 caracteres');
          return;
        }

        const provisionUser = httpsCallable(functions, 'provisionUser');
        const result = await provisionUser({
          email: rawEmail,
          password,
          role: userProfileData.role,
          commissionRate: userProfileData.commissionRate,
          status: userProfileData.status,
          canLiquidate: userProfileData.role === 'admin' ? userProfileData.canLiquidate === true : false,
          currentDebt: userProfileData.currentDebt || 0,
        });
        const provisionedUser = (result.data as { user?: UserProfile }).user;
        if (!provisionedUser?.email) {
          throw new Error('El backend no devolvio el perfil creado');
        }

        const normalizedFirestoreEmail = String(provisionedUser.email || '').toLowerCase();
        upsertUserLocally(provisionedUser);
        toast.success('Usuario creado correctamente');
        setShowUserModal(false);
        setEditingUser(null);

        if (normalizedRole === 'ceo' || normalizedRole === 'admin') {
          await logDailyAuditEvent({
            type: 'USER_CREATED',
            actor: {
              email: currentUserEmail,
              sellerId: currentUserProfile?.sellerId,
              name: currentUserProfile?.name,
              role: normalizedRole,
            },
            target: {
              email: normalizedFirestoreEmail,
              sellerId: provisionedUser.sellerId || '',
              name: provisionedUser.name || '',
            },
            details: {
              updatedFields: Object.keys(provisionedUser),
              targetUsername: normalizedFirestoreEmail.split('@')[0] || normalizedFirestoreEmail,
              targetRole: provisionedUser.role,
              nextRole: provisionedUser.role,
              previousRole: '',
              commissionRate: Number(provisionedUser.commissionRate || 0),
              nextCommissionRate: Number(provisionedUser.commissionRate || 0),
              previousCommissionRate: 0,
              nextName: String(provisionedUser.name || ''),
              previousName: '',
              nextSellerId: String(provisionedUser.sellerId || ''),
              previousSellerId: '',
              status: String(provisionedUser.status || ''),
              createdByEmail: actorEmail,
              updatedByEmail: actorEmail,
            },
          }).catch((error) => {
            console.error('Daily audit log failed (users create):', error);
          });

          const actionLabel = 'creo';
          const targetUsername = normalizedFirestoreEmail.split('@')[0] || normalizedFirestoreEmail;
          await createCeoAdminAlert({
            type: `${normalizedRole}_user_created`,
            priority: 70,
            title: 'Usuario creado',
            message: `${currentUserProfile?.name || actorEmail || normalizedRole.toUpperCase()} ${actionLabel} usuario ${String(provisionedUser.name || targetUsername)} (${targetUsername}) con rol ${String(provisionedUser.role || 'seller')} y comision ${Number(provisionedUser.commissionRate || 0).toFixed(2)}%.`,
            createdByEmail: actorEmail,
            createdByRole: normalizedRole,
            metadata: {
              actorName: currentUserProfile?.name || '',
              actorSellerId: currentUserProfile?.sellerId || '',
              actorRole: normalizedRole,
              targetEmail: normalizedFirestoreEmail,
              targetUsername,
              targetName: String(provisionedUser.name || ''),
              targetSellerId: String(provisionedUser.sellerId || ''),
              targetRole: String(provisionedUser.role || ''),
              commissionRate: Number(provisionedUser.commissionRate || 0),
              updatedFields: Object.keys(provisionedUser),
              previousRole: '',
              previousCommissionRate: 0,
              nextRole: String(provisionedUser.role || ''),
              nextCommissionRate: Number(provisionedUser.commissionRate || 0),
            },
            actionRef: `users/${normalizedFirestoreEmail}`,
          }).catch((error) => {
            console.error('App alert failed (users create):', error);
          });
        }

        return;
      }

      if (!userProfileData.sellerId) {
        const newSellerId = await reserveNextSellerId(userProfileData.role);
        userProfileData.sellerId = newSellerId;
        userProfileData.name = newSellerId;
      }

      if (!userProfileData.email.includes('@')) {
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
            targetUsername: normalizedFirestoreEmail.split('@')[0] || normalizedFirestoreEmail,
            targetRole: cleanData.role,
            nextRole: cleanData.role,
            previousRole: previousUserData?.role || '',
            commissionRate: Number(cleanData.commissionRate || 0),
            nextCommissionRate: Number(cleanData.commissionRate || 0),
            previousCommissionRate: Number(previousUserData?.commissionRate || 0),
            nextName: String(cleanData.name || ''),
            previousName: String(previousUserData?.name || ''),
            nextSellerId: String(cleanData.sellerId || ''),
            previousSellerId: String(previousUserData?.sellerId || ''),
            status: String(cleanData.status || ''),
            createdByEmail: String(cleanData.createdByEmail || ''),
            updatedByEmail: actorEmail,
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

    const targetUser = users.find((userItem) => String(userItem.email || '').toLowerCase() === email.toLowerCase());
    const targetIsProtectedOwner = targetUser?.isPrimaryCeo === true ||
      String(targetUser?.email || '').toLowerCase() === (import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com').toLowerCase() ||
      String(targetUser?.sellerId || '').toLowerCase() === 'ceo01';

    if (targetIsProtectedOwner) {
      toast.error('El CEO Owner no se puede eliminar');
      return;
    }

    if (targetUser?.role === 'ceo' && !isPrimaryCeoUser) {
      toast.error('Solo el CEO Owner puede eliminar otros CEOs');
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
