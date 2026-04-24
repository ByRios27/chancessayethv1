import React from 'react';
import { motion } from 'motion/react';
import { Plus, Settings, ShieldCheck, Trash2, TrendingUp, XCircle } from 'lucide-react';
import {
  ADMIN_CONFIG_DOMAIN_SPEC,
  canExecuteAdminConfigAction,
} from '../../domains/admin-config/domainSpec';

type AdminSectionProps = any;

export function AdminSection(props: AdminSectionProps) {
  const {
    userProfile,
    setShowSettingsModal,
    setEditingLottery,
    setShowLotteryModal,
    sortedLotteries,
    formatTime12h,
    cleanText,
    toggleLotteryActive,
    deleteLottery,
    globalSettings,
    lotteries,
    createLottery,
    toast,
    query,
    collection,
    db,
    getDocs,
    updateDoc,
    doc,
    handleDeleteAllSalesData,
  } = props;

  const role = userProfile?.role;
  const safeSortedLotteries = Array.isArray(sortedLotteries) ? sortedLotteries : [];
  const safeLotteries = Array.isArray(lotteries) ? lotteries : [];

  const canCreateLottery = canExecuteAdminConfigAction(role, 'createLottery');
  const canEditLottery = canExecuteAdminConfigAction(role, 'editLottery');
  const canDeleteLottery = canExecuteAdminConfigAction(role, 'deleteLottery');
  const canToggleLottery = canExecuteAdminConfigAction(role, 'toggleLotteryActive');
  const canUpdateGlobalSettings = canExecuteAdminConfigAction(role, 'updateGlobalSettings');
  const canAccessDangerZone = canExecuteAdminConfigAction(role, 'accessDangerZone');

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="glass-card p-4 sm:p-6 md:p-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">CONFIGURACION GENERAL</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
              Gestion de sorteos y ajustes permitidos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {canUpdateGlobalSettings && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex-1 sm:flex-none bg-white/5 text-white px-4 sm:px-6 py-3 rounded-xl font-bold uppercase text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all border border-white/10"
              >
                <Settings className="w-4 h-4" /> Ajustes Globales
              </button>
            )}
            {canCreateLottery && (
              <button
                onClick={() => {
                  setEditingLottery(null);
                  setShowLotteryModal(true);
                }}
                className="flex-1 sm:flex-none bg-primary text-primary-foreground px-4 sm:px-6 py-3 rounded-xl font-bold uppercase text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <Plus className="w-4 h-4" /> Nuevo Sorteo
              </button>
            )}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-white/5">
            {safeSortedLotteries.map((lot: any) => (
              <div key={lot.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${lot.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                  <div>
                    <p className="font-black uppercase tracking-tight text-sm">{cleanText(lot.name)}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        <TrendingUp className="w-3 h-3 text-primary" /> {formatTime12h(lot.drawTime)}
                      </div>
                      {lot.closingTime && (
                        <div className="flex items-center gap-1 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-red-400 border border-red-500/20">
                          <XCircle className="w-3 h-3" /> {formatTime12h(lot.closingTime)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {(canEditLottery || canToggleLottery || canDeleteLottery) && (
                  <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                    {canEditLottery && (
                      <button
                        onClick={() => {
                          setEditingLottery(lot);
                          setShowLotteryModal(true);
                        }}
                        className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 px-4 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                      >
                        Editar
                      </button>
                    )}
                    {canToggleLottery && (
                      <button
                        onClick={() => toggleLotteryActive(lot)}
                        className={`flex-1 md:flex-none px-4 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          lot.active
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                        }`}
                      >
                        {lot.active ? 'Pausar' : 'Activar'}
                      </button>
                    )}
                    {canDeleteLottery && (
                      <button
                        onClick={() => deleteLottery(lot.id)}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {safeSortedLotteries.length === 0 && (
          <div className="mt-4 text-xs font-mono uppercase tracking-wider text-amber-300/90 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
            {ADMIN_CONFIG_DOMAIN_SPEC.emptyStates.noLotteries}
          </div>
        )}

        {safeLotteries.length === 0 && canCreateLottery && (
          <button
            onClick={async () => {
              const defaults = [
                { name: 'Loteria de Medellin', drawTime: '22:30', closingTime: '22:00' },
                { name: 'Loteria de Bogota', drawTime: '22:30', closingTime: '22:00' },
                { name: 'Chontico Dia', drawTime: '13:00', closingTime: '12:45' },
                { name: 'Chontico Noche', drawTime: '19:00', closingTime: '18:45' },
                { name: 'Paisa 1', drawTime: '13:00', closingTime: '12:45' },
                { name: 'Paisa 2', drawTime: '18:00', closingTime: '17:45' },
              ];
              for (const lot of defaults) {
                await createLottery({ ...lot, active: true });
              }
              toast.success('Sorteos iniciales creados');
            }}
            className="col-span-full p-10 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group mt-4"
          >
            <Settings className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="text-center">
              <p className="font-black uppercase tracking-widest text-sm">Sembrar Sorteos Iniciales</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">Carga rapida de sorteos comunes</p>
            </div>
          </button>
        )}

        {canUpdateGlobalSettings && (
          <button
            onClick={async () => {
              const q = query(collection(db, 'lotteries'));
              const snap = await getDocs(q);
              let fixedCount = 0;
              for (const docSnap of snap.docs) {
                const data = docSnap.data();
                if (data.name && (data.name.includes('??') || data.name.includes('<') || data.name.includes('\u00C3'))) {
                  const newName = cleanText(data.name);
                  await updateDoc(doc(db, 'lotteries', docSnap.id), { name: newName });
                  fixedCount++;
                }
              }
              toast.success(`${fixedCount} sorteos corregidos`);
            }}
            className="col-span-full p-4 border border-dashed border-primary/30 rounded-xl flex items-center justify-center gap-4 hover:bg-primary/5 transition-all group mt-4"
          >
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="font-bold uppercase tracking-widest text-xs">Corregir nombres corruptos</p>
            </div>
          </button>
        )}

        {canAccessDangerZone && (
          <div className="mt-12 pt-8 border-t border-red-500/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-red-500/5 p-8 rounded-2xl border border-red-500/10">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter text-red-400 uppercase flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Zona de Peligro
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-2 max-w-xl">
                  Esta accion elimina datos de ventas/tickets/inyecciones/resultados y mantiene usuarios/sorteos.
                </p>
              </div>
              <button
                onClick={handleDeleteAllSalesData}
                className="w-full md:w-auto bg-red-500/10 text-red-400 px-6 py-4 rounded-xl font-bold uppercase text-xs sm:text-sm tracking-widest flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all border border-red-500/20"
              >
                <Trash2 className="w-5 h-5" /> Borrar Datos de Ventas
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
