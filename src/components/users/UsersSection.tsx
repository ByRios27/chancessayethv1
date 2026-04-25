import React from 'react';
import { motion } from 'motion/react';
import { Plus, Settings, Trash2, User as UserIcon, Zap } from 'lucide-react';
import { USERS_DOMAIN_SPEC, canExecuteUsersAction } from '../../domains/users/domainSpec';

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
}: UsersSectionProps) {
  const role = userProfile?.role;
  const canCreateUser = canExecuteUsersAction(role, 'createUser');
  const canEditUser = canExecuteUsersAction(role, 'editUser');
  const canDeleteUser = canExecuteUsersAction(role, 'deleteUser');
  const canInjectCapital = canExecuteUsersAction(role, 'injectCapital');

  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="glass-card p-4 sm:p-6 md:p-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">USUARIOS</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">Gestion de perfiles, estado y comision</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select
              value={selectedManageUserEmail}
              onChange={(e) => setSelectedManageUserEmail(e.target.value)}
              className="w-full sm:w-64 bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option key="default" value="" className="bg-gray-900">Seleccionar usuario...</option>
              {(() => {
                const validUsers = users.filter(u => u && u.email && u.name && u.name.trim() !== '');
                if (userProfile?.role === 'ceo' && !validUsers.some(u => u.email === userProfile.email)) {
                  validUsers.unshift(userProfile);
                }
                return validUsers.map((u, i) => {
                  const stats = userStats[u.email.toLowerCase()];
                  const isLowUtility = stats && stats.utility < 0;
                  return (
                    <option
                      key={u.email || `manage-${i}`}
                      value={u.email}
                      className={`bg-gray-900 ${isLowUtility ? 'text-red-500 font-bold' : ''}`}
                    >
                      {u.name} ({u.email?.split('@')[0] || ''}) {isLowUtility ? '?' : ''}
                    </option>
                  );
                });
              })()}
            </select>
            {canCreateUser && (
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowUserModal(true);
                }}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <Plus className="w-4 h-4" /> Nuevo Usuario
              </button>
            )}
          </div>
        </div>

        {selectedManageUserEmail ? (() => {
          const validUsers = users.filter(u => u && u.email && u.name && u.name.trim() !== '');
          if (userProfile?.role === 'ceo' && !validUsers.some(u => u.email === userProfile.email)) {
            validUsers.unshift(userProfile);
          }
          const u = validUsers.find(user => user.email === selectedManageUserEmail);
          if (!u) return null;
          const stats = userStats[u.email.toLowerCase()];
          return (
            <div className="glass-card p-6 border-white/5 bg-white/[0.01] transition-all">
              <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight text-white/90">{u.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{u.role}</p>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-[10px] font-mono text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                    u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {u.status}
                  </span>
                  {stats && stats.utility < 0 && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase animate-pulse">
                      Saldo Negativo
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Ventas</p>
                  <p className="text-lg font-black text-white">${(stats?.sales || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Premios</p>
                  <p className="text-lg font-black text-red-400">${(stats?.prizes || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Inyecciones</p>
                  <p className="text-lg font-black text-blue-400">${(stats?.injections || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Utilidad Neta</p>
                  <p className={`text-lg font-black ${stats?.utility && stats.utility < 0 ? 'text-red-500' : 'text-green-400'}`}>
                    ${(stats?.utility || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Comision Asignada</p>
                  <p className="text-xl font-black text-white">{u.commissionRate}%</p>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Deuda Actual</p>
                  <p className={`text-xl font-black ${u.currentDebt && u.currentDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    USD {(u.currentDebt || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canEditUser && (
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setShowUserModal(true);
                    }}
                    disabled={u.role === 'ceo' && role !== 'ceo'}
                    className="flex-1 min-w-0 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Settings className="w-4 h-4" /> Configurar
                  </button>
                )}

                {canInjectCapital && (
                  <button
                    onClick={() => {
                      setInjectionTargetUserEmail(u.email);
                      setInjectionDefaultType('injection');
                      setIsInjectionOnly(true);
                      setShowInjectionModal(true);
                    }}
                    className="flex-1 min-w-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Inyectar Capital
                  </button>
                )}

                {canDeleteUser && u.role !== 'ceo' && (
                  <button
                    onClick={() => deleteUser(u.email)}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                    title="Eliminar Usuario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-mono text-sm uppercase tracking-widest border-2 border-dashed border-border rounded-2xl p-10">
            {USERS_DOMAIN_SPEC.emptyStates.noSelection}
          </div>
        )}
      </div>
    </motion.div>
  );
}
