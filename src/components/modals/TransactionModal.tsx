import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { UserProfile } from '../../types/users';
import { collection, db, doc, serverTimestamp, writeBatch } from '../../firebase';
import { createCeoAdminAlert } from '../../services/repositories/appAlertsRepo';
import { logDailyAuditEvent } from '../../services/repositories/auditLogsRepo';
import { getBusinessDate } from '../../utils/dates';

const TransactionModal = ({
  show,
  onClose,
  users,
  currentUser,
  userProfile,
  targetUserEmail,
  defaultType = 'injection',
  initialAmount = '',
  allowOnlyInjection = false,
  onInjectionSaved,
}: {
  show: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser: any;
  userProfile: UserProfile | null;
  targetUserEmail?: string;
  defaultType?: 'injection' | 'payment' | 'debt';
  initialAmount?: string;
  allowOnlyInjection?: boolean;
  onInjectionSaved?: (payload: Record<string, unknown>) => void;
}) => {
  void allowOnlyInjection;
  const [targetEmail, setTargetEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'injection' | 'payment' | 'debt'>(defaultType);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setType(defaultType);
      setAmount(initialAmount);
      if (targetUserEmail) {
        setTargetEmail(targetUserEmail);
      } else if (!targetEmail) {
        setTargetEmail('');
      }
    }
  }, [show, targetUserEmail, defaultType, initialAmount]);

  const allUsers = [...users].filter((u) => u && u.email && u.name && u.name.trim() !== '');
  if (userProfile && !allUsers.find((u) => u.email === userProfile.email)) {
    allUsers.push(userProfile);
  }

  if (!show) return null;

  const handleSave = async () => {
    if (!targetEmail || !amount || Number.isNaN(Number(amount))) return;

    const targetUser = allUsers.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    const targetSellerId = (targetUser?.sellerId || '').trim();
    if (!targetSellerId) {
      toast.error('Usuario destino sin sellerId operativo');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const transactionRef = doc(collection(db, 'injections'));
      const businessDate = format(getBusinessDate(), 'yyyy-MM-dd');
      const actorEmail = String(userProfile?.email || '').toLowerCase();
      const actorSellerId = String(userProfile?.sellerId || '');
      const actorName = String(userProfile?.name || '');
      const amountValue = Number(amount);

      const payload = {
        sellerId: targetSellerId,
        userEmail: targetEmail.toLowerCase(),
        amount: amountValue,
        type,
        date: businessDate,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        addedBy: currentUser?.uid || '',
        createdBy: currentUser?.uid || '',
        createdByEmail: actorEmail,
        createdBySellerId: actorSellerId,
        createdByName: actorName,
        actorEmail,
        actorSellerId,
        actorName,
        liquidated: false,
      };

      batch.set(transactionRef, payload);
      await batch.commit();

      onInjectionSaved?.({
        id: transactionRef.id,
        ...payload,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (actorEmail && (userProfile?.role === 'admin' || userProfile?.role === 'ceo')) {
        await logDailyAuditEvent({
          type: 'INJECTION_CREATED',
          actor: {
            email: actorEmail,
            sellerId: actorSellerId,
            name: actorName,
            role: userProfile?.role,
          },
          target: {
            email: targetEmail.toLowerCase(),
            sellerId: targetSellerId,
            name: targetUser?.name || '',
          },
          details: {
            amount: amountValue,
            injectionType: type,
            injectionId: transactionRef.id,
          },
          date: businessDate,
        }).catch((error) => {
          console.error('Daily audit log failed (injection create):', error);
        });
      }

      if (actorEmail && (userProfile?.role === 'admin' || userProfile?.role === 'ceo')) {
        const actorRole = String(userProfile.role || '').toLowerCase();
        await createCeoAdminAlert({
          type: `${actorRole}_injection_created`,
          priority: 80,
          title: 'Inyeccion creada',
          message: `${actorName || actorEmail} inyecto USD ${amountValue.toFixed(2)} a ${targetUser?.name || targetEmail.toLowerCase()}.`,
          createdByEmail: actorEmail,
          createdByRole: userProfile.role,
          metadata: {
            actorName,
            actorSellerId,
            actorRole,
            targetEmail: targetEmail.toLowerCase(),
            targetSellerId,
            targetName: targetUser?.name || '',
            amount: amountValue,
            injectionType: type,
            injectionId: transactionRef.id,
            date: businessDate,
          },
          actionRef: `injections/${transactionRef.id}`,
        }).catch((error) => {
          console.error('App alert failed (injection create):', error);
        });
      }

      toast.success('Inyeccion añadida');
      onClose();
      setTargetEmail('');
      setAmount('');
      setType('injection');
    } catch (error) {
      const firebaseCode = (error as { code?: string })?.code || 'unknown';
      const firebaseMessage = error instanceof Error ? error.message : String(error);
      toast.error('Error al guardar (injections/users (batch))', {
        description: `Codigo: ${firebaseCode} | Causa: ${firebaseMessage}`,
      });
      console.error(
        'Firestore Error Details:',
        JSON.stringify(
          {
            error: firebaseMessage,
            code: firebaseCode,
            cause: firebaseMessage,
            operationType: 'write',
            path: 'injections/users (batch)',
          },
          null,
          2
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-4 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">Añadir Inyeccion</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex bg-black/40 p-1 rounded-xl mb-4">
            <button
              onClick={() => setType('injection')}
              className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all bg-primary text-primary-foreground"
            >
              Inyeccion
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Usuario</label>
            <select
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option key="default" value="" className="bg-gray-900">
                Seleccionar usuario...
              </option>
              {allUsers
                .filter((u) => u.role === 'seller' || u.role === 'admin' || u.role === 'ceo')
                .map((u, i) => {
                  const username = u.email?.split('@')[0] || '';
                  const displayName = `${u.name} (${username})`;
                  return (
                    <option key={u.email || `all-${i}`} value={u.email} className="bg-gray-900">
                      {displayName}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Monto (USD)</label>
            <input
              type="number"
              value={amount === 'NaN' ? '' : amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-50 mt-4 bg-primary text-primary-foreground hover:brightness-110"
          >
            {loading ? 'Guardando...' : 'Guardar Inyeccion'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionModal;

