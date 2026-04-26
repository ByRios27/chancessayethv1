import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Edit2, Plus, Settings, Trash2, User as UserIcon, Zap } from 'lucide-react';
import { USERS_DOMAIN_SPEC, canExecuteUsersAction } from '../../domains/users/domainSpec';
import type { Injection } from '../../types/finance';

type UsersSectionProps = {
  selectedManageUserEmail: string;
  setSelectedManageUserEmail: (value: string) => void;
  users: any[];
  userProfile: any;
  userStats: Record<string, any>;
  setEditingUser: (value: any) => void;
  setShowUserModal: (value: boolean) => void;
  setInjectionTargetUserEmail: (value: string) => void;
  setInjectionDefaultType: (value: 'injection' | 'payment' | 'debt') => void;
  setIsInjectionOnly: (value: boolean) => void;
  setShowInjectionModal: (value: boolean) => void;
  deleteUser: (email: string) => void;
  injections: Injection[];
  businessDayKey: string;
  canMutateInjection: (injection: Injection) => boolean;
  updateInjectionAmount: (injection: Injection, nextAmount: number) => Promise<void>;
  deleteInjection: (injection: Injection) => void;
};

export function UsersSection({
  selectedManageUserEmail,
  setSelectedManageUserEmail,
  users,
  userProfile,
  userStats,
  setEditingUser,
  setShowUserModal,
  setInjectionTargetUserEmail,
  setInjectionDefaultType,
  setIsInjectionOnly,
  setShowInjectionModal,
  deleteUser,
  injections,
  businessDayKey,
  canMutateInjection,
  updateInjectionAmount,
  deleteInjection,
}: UsersSectionProps) {
  const role = userProfile?.role;
  const canCreateUser = canExecuteUsersAction(role, 'createUser');
  const canEditUser = canExecuteUsersAction(role, 'editUser');
  const canDeleteUser = canExecuteUsersAction(role, 'deleteUser');
  const canInjectCapital = canExecuteUsersAction(role, 'injectCapital');
  const canManageInjectionEntries = role === 'ceo' || role === 'admin';

  const [editingInjectionId, setEditingInjectionId] = useState<string | null>(null);
  const [editingInjectionAmount, setEditingInjectionAmount] = useState('');

  const validUsers = useMemo(() => {
    const list = (users || []).filter((u) => u && u.email && u.name && u.name.trim() !== '');
    if (userProfile?.role === 'ceo' && userProfile?.email && !list.some((u) => u.email === userProfile.email)) {
      return [userProfile, ...list];
    }
    return list;
  }, [users, userProfile]);

  const selectedUser = useMemo(
    () => validUsers.find((u) => u.email === selectedManageUserEmail) || null,
    [selectedManageUserEmail, validUsers]
  );

  const selectedUserInjections = useMemo(() => {
    if (!selectedUser?.email) return [];
    const targetEmail = String(selectedUser.email || '').toLowerCase();
    return (injections || [])
      .filter((inj) => String(inj?.date || '') === businessDayKey)
      .filter((inj) => String(inj?.userEmail || '').toLowerCase() === targetEmail)
      .sort((a, b) => {
        const aTime = a?.timestamp?.toDate?.()?.getTime?.() ?? (a?.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const bTime = b?.timestamp?.toDate?.()?.getTime?.() ?? (b?.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return bTime - aTime;
      });
  }, [businessDayKey, injections, selectedUser?.email]);

  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <div className="glass-card p-3 sm:p-4 md:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white/95">Usuarios</h2>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">Perfiles, estado y comision</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedManageUserEmail}
              onChange={(e) => setSelectedManageUserEmail(e.target.value)}
              className="h-12 w-full sm:w-72 bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all"
            >
              <option key="default" value="" className="bg-slate-900">Seleccionar usuario...</option>
              {validUsers.map((u, i) => {
                const stats = userStats[u.email.toLowerCase()];
                const needsInjection = u?.requiresInjection === true;
                return (
                  <option
                    key={u.email || `manage-${i}`}
                    value={u.email}
                    className={`bg-slate-900 ${needsInjection ? 'text-red-400 font-bold' : ''}`}
                  >
                    {u.name} ({u.email?.split('@')[0] || ''}) {stats && stats.utility < 0 ? '•' : ''}
                  </option>
                );
              })}
            </select>
            {canCreateUser && (
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowUserModal(true);
                }}
                className="h-12 w-full sm:w-auto bg-primary text-primary-foreground px-4 rounded-xl font-bold uppercase text-[11px] tracking-wide flex items-center justify-center gap-2 hover:bg-blue-400 transition-all"
              >
                <Plus className="w-4 h-4" /> Nuevo Usuario
              </button>
            )}
          </div>
        </div>

        {selectedUser ? (() => {
          const stats = userStats[selectedUser.email.toLowerCase()];
          return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4 transition-all backdrop-blur-md">
              <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm uppercase tracking-tight text-white truncate">{selectedUser.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{selectedUser.role}</p>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide ${
                    selectedUser.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {selectedUser.status}
                  </span>
                  {selectedUser?.requiresInjection === true && (
                    <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-1 rounded-full text-[9px] font-black uppercase">
                      Requiere inyeccion
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Ventas</p>
                  <p className="text-base font-black text-white leading-none">${(stats?.sales || 0).toFixed(2)}</p>
                </div>
                <div className="h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Premios</p>
                  <p className="text-base font-black text-red-400 leading-none">${(stats?.prizes || 0).toFixed(2)}</p>
                </div>
                <div className="h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Inyecciones</p>
                  <p className="text-base font-black text-blue-400 leading-none">${(stats?.injections || 0).toFixed(2)}</p>
                </div>
                <div className="h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Utilidad</p>
                  <p className={`text-base font-black leading-none ${stats?.utility && stats.utility < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ${(stats?.utility || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-mono uppercase tracking-wide text-white/85">
                  Comision: <span className="font-black text-blue-300">{selectedUser.commissionRate}%</span>
                </p>
                <p className={`text-xs font-mono uppercase tracking-wide ${selectedUser.currentDebt && selectedUser.currentDebt > 0 ? 'text-red-300' : 'text-green-300'}`}>
                  Deuda: <span className="font-black">${(selectedUser.currentDebt || 0).toFixed(2)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canEditUser && (
                  <button
                    onClick={() => {
                      setEditingUser(selectedUser);
                      setShowUserModal(true);
                    }}
                    disabled={selectedUser.role === 'ceo' && role !== 'ceo'}
                    className="h-10 flex-1 min-w-0 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Settings className="w-3.5 h-3.5" /> Editar
                  </button>
                )}

                {canInjectCapital && (
                  <button
                    onClick={() => {
                      setInjectionTargetUserEmail(selectedUser.email);
                      setInjectionDefaultType('injection');
                      setIsInjectionOnly(true);
                      setShowInjectionModal(true);
                    }}
                    className="h-10 flex-1 min-w-0 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/35 text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" /> Inyectar
                  </button>
                )}

                {canDeleteUser && selectedUser.role !== 'ceo' && (
                  <button
                    onClick={() => deleteUser(selectedUser.email)}
                    className="h-10 w-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all flex items-center justify-center"
                    title="Eliminar Usuario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {canManageInjectionEntries && (
                <div className="mt-3 border border-white/10 rounded-xl bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Inyecciones del dia</p>
                  {selectedUserInjections.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin inyecciones registradas hoy.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedUserInjections.map((inj) => {
                        const canMutate = canMutateInjection(inj);
                        const isEditing = editingInjectionId === inj.id;
                        return (
                          <div key={`inj-${inj.id}`} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 bg-white/[0.03]">
                            <span className="text-[11px] text-white/80 flex-1 truncate">
                              {(inj.createdByName || inj.createdByEmail || inj.actorEmail || 'sin autor')} · {String(inj.type || 'injection').toUpperCase()}
                            </span>
                            {isEditing ? (
                              <>
                                <input
                                  type="number"
                                  value={editingInjectionAmount}
                                  onChange={(event) => setEditingInjectionAmount(event.target.value)}
                                  className="w-20 h-8 rounded-md border border-white/15 bg-black/20 px-2 text-right text-sm"
                                />
                                <button
                                  onClick={async () => {
                                    const parsed = Number.parseFloat(editingInjectionAmount);
                                    if (!Number.isFinite(parsed) || parsed < 0) return;
                                    await updateInjectionAmount(inj, parsed);
                                    setEditingInjectionId(null);
                                    setEditingInjectionAmount('');
                                  }}
                                  className="h-8 px-2 rounded-md border border-green-400/30 text-green-300 text-[10px] font-black uppercase"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingInjectionId(null);
                                    setEditingInjectionAmount('');
                                  }}
                                  className="h-8 px-2 rounded-md border border-white/20 text-white/70 text-[10px] font-black uppercase"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-black text-blue-300">${Number(inj.amount || 0).toFixed(2)}</span>
                                {canMutate && (
                                  <button
                                    onClick={() => {
                                      setEditingInjectionId(inj.id);
                                      setEditingInjectionAmount(String(Number(inj.amount || 0)));
                                    }}
                                    className="h-8 w-8 rounded-md border border-white/20 text-white/80 flex items-center justify-center"
                                    title="Editar inyeccion"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canMutate && (
                                  <button
                                    onClick={() => deleteInjection(inj)}
                                    className="h-8 w-8 rounded-md border border-red-400/30 text-red-400 flex items-center justify-center"
                                    title="Borrar inyeccion"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="h-48 flex items-center justify-center text-muted-foreground font-mono text-xs uppercase tracking-widest border border-dashed border-white/20 rounded-2xl p-6 bg-white/[0.02]">
            {USERS_DOMAIN_SPEC.emptyStates.noSelection}
          </div>
        )}
      </div>
    </motion.div>
  );
}

