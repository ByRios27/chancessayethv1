import { motion } from 'motion/react';
import { Clock3, Edit3, Plus, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ADMIN_CONFIG_DOMAIN_SPEC,
  canExecuteAdminConfigAction,
} from '../../domains/admin-config/domainSpec';
import { createLottery as createLotteryRecord } from '../../services/repositories/lotteriesRepo';

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
  } = props;

  const role = userProfile?.role;
  const isCeoOwner = Boolean(props.isPrimaryCeoUser);
  const safeSortedLotteries = Array.isArray(sortedLotteries) ? sortedLotteries : [];

  const canCreateLottery = canExecuteAdminConfigAction(role, 'createLottery');
  const canEditLottery = canExecuteAdminConfigAction(role, 'editLottery');
  const canDeleteLottery = canExecuteAdminConfigAction(role, 'deleteLottery');
  const canToggleLottery = canExecuteAdminConfigAction(role, 'toggleLotteryActive');
  const canUpdateGlobalSettings = canExecuteAdminConfigAction(role, 'updateGlobalSettings', isCeoOwner);
  const canSeedInitialLotteries = safeSortedLotteries.length === 0 && canCreateLottery;
  const configSubtitle = canUpdateGlobalSettings
    ? 'Sorteos, ajustes globales y mantenimiento'
    : role === 'admin'
      ? 'Activacion y pausa de sorteos'
      : 'Gestion de sorteos';

  const handleSeedInitialLotteries = async () => {
    const defaults = [
      { name: 'Loteria de Medellin', drawTime: '22:30', closingTime: '22:00' },
      { name: 'Loteria de Bogota', drawTime: '22:30', closingTime: '22:00' },
      { name: 'Chontico Dia', drawTime: '13:00', closingTime: '12:45' },
      { name: 'Chontico Noche', drawTime: '19:00', closingTime: '18:45' },
      { name: 'Paisa 1', drawTime: '13:00', closingTime: '12:45' },
      { name: 'Paisa 2', drawTime: '18:00', closingTime: '17:45' },
    ];

    for (const lot of defaults) {
      await createLotteryRecord({ ...lot, active: true });
    }
    toast.success('Sorteos iniciales creados');
  };

  const handleDeleteLottery = (lot: any) => {
    const lotteryName = cleanText(lot?.name || 'este sorteo');
    const confirmed = window.confirm(`Eliminar ${lotteryName}? Esta accion no se puede deshacer.`);
    if (!confirmed) return;
    deleteLottery(lot.id);
  };

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-3"
    >
      <section className="glass-card p-2.5 sm:p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase text-white">
              Configuracion General
            </h2>
            <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase tracking-wider max-w-2xl">
              {configSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
            {canUpdateGlobalSettings && (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="h-8 px-3 rounded-lg border border-white/10 bg-white/[0.05] text-white font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/[0.09] active:scale-[0.98] transition-all"
                aria-label="Abrir ajustes globales"
                title="Ajustes globales"
              >
                <Settings className="w-3.5 h-3.5" /> Ajustes globales
              </button>
            )}
            {canCreateLottery && (
              <button
                type="button"
                onClick={() => {
                  setEditingLottery(null);
                  setShowLotteryModal(true);
                }}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
                aria-label="Crear nuevo sorteo"
                title="Nuevo sorteo"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo sorteo
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Sorteos activos</h3>
            <p className="text-[10px] text-muted-foreground">Control operativo de horarios y estado</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
            {safeSortedLotteries.length} sorteos
          </span>
        </div>

        {safeSortedLotteries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-xs font-mono uppercase tracking-wider text-amber-300/90">
            {ADMIN_CONFIG_DOMAIN_SPEC.emptyStates.noLotteries}
          </div>
        ) : (
          <div className="space-y-2">
            {safeSortedLotteries.map((lot: any) => (
              <article
                key={lot.id}
                className="rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1.5 flex items-center gap-2 hover:border-white/20 hover:bg-white/[0.05] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-black uppercase tracking-tight text-[12px] sm:text-sm text-white truncate">
                    {cleanText(lot.name)}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-mono text-muted-foreground uppercase">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="w-3 h-3 text-primary" />
                      {formatTime12h(lot.drawTime)}
                    </span>
                    {lot.closingTime && (
                      <span className="rounded border border-white/10 bg-black/20 px-1 py-0.5">
                        Cierre {formatTime12h(lot.closingTime)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  {canToggleLottery ? (
                    <button
                      type="button"
                      onClick={() => toggleLotteryActive(lot)}
                      disabled={!lot.id}
                      className={`h-6 rounded-full px-2.5 text-[8px] font-black uppercase tracking-wider border transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed ${
                        lot.active
                          ? 'bg-green-500/15 text-green-300 border-green-400/25 hover:bg-green-500/25'
                          : 'bg-amber-500/15 text-amber-300 border-amber-400/25 hover:bg-amber-500/25'
                      }`}
                      aria-label={lot.active ? `Pausar sorteo ${cleanText(lot.name)}` : `Activar sorteo ${cleanText(lot.name)}`}
                      title={lot.active ? 'Pausar sorteo' : 'Activar sorteo'}
                    >
                      {lot.active ? 'ACTIVO' : 'PAUSADO'}
                    </button>
                  ) : (
                    <span
                      className={`h-6 inline-flex items-center rounded-full px-2.5 text-[8px] font-black uppercase tracking-wider border ${
                      lot.active
                        ? 'bg-green-500/15 text-green-300 border-green-400/25'
                        : 'bg-amber-500/15 text-amber-300 border-amber-400/25'
                      }`}
                    >
                      {lot.active ? 'ACTIVO' : 'PAUSADO'}
                    </span>
                  )}

                  {canEditLottery && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLottery(lot);
                        setShowLotteryModal(true);
                      }}
                      disabled={!lot.id}
                      className="h-6 w-6 rounded-md border border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.09] active:scale-95 transition-all flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                      aria-label={`Editar sorteo ${cleanText(lot.name)}`}
                      title="Editar sorteo"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                  {canDeleteLottery && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLottery(lot)}
                      disabled={!lot.id}
                      className="h-6 w-6 rounded-md border border-red-400/20 bg-red-500/8 text-red-300 hover:bg-red-500/15 active:scale-95 transition-all flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                      aria-label={`Eliminar sorteo ${cleanText(lot.name)}`}
                      title="Eliminar sorteo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {canSeedInitialLotteries && (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <button
            type="button"
            onClick={handleSeedInitialLotteries}
            className="w-full rounded-lg border border-dashed border-primary/35 bg-primary/8 px-3 py-2 flex items-center justify-center gap-2 text-left hover:bg-primary/12 active:scale-[0.99] transition-all"
          >
            <Settings className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white">Sembrar sorteos iniciales</p>
              <p className="text-[10px] text-muted-foreground truncate">Carga rapida cuando la lista esta vacia.</p>
            </div>
          </button>
        </section>
      )}
    </motion.div>
  );
}
