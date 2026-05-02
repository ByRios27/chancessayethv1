import { motion } from 'motion/react';
import { BadgeDollarSign, Lock, Ticket as TicketIcon } from 'lucide-react';

type ConfigSectionProps = any;

export function ConfigSection(props: ConfigSectionProps) {
  const {
    handleUpdateChancePrice,
    personalChancePrice,
    setPersonalChancePrice,
    globalSettings,
    canUpdatePersonalChancePrice,
    isUpdatingChancePrice,
    userProfile,
    isUpdatingSpecial4dPreference,
    requestSpecial4dPreferenceChange,
    handleUpdatePassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isUpdatingPassword,
  } = props;

  const special4dSettings = globalSettings?.special4d;
  const isSpecial4dGloballyEnabled = Boolean(special4dSettings?.enabled);
  const isSpecial4dUserEnabled = userProfile ? userProfile.special4dEnabled !== false : false;

  return (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="glass-card p-4 sm:p-6 md:p-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                    <div>
                      <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">CONFIGURACIÓN</h2>
                      <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">Ajustes Personales y del Sistema</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass-card p-6 border-white/5 bg-white/[0.02] space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                          <TicketIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest text-sm">Precio de Chance</h3>
                      </div>

                      <form onSubmit={handleUpdateChancePrice} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Precio de Venta de Chance</label>
                          <select
                            value={personalChancePrice}
                            onChange={(e) => setPersonalChancePrice(parseFloat(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                            disabled={isUpdatingChancePrice || !canUpdatePersonalChancePrice || !globalSettings.chancePrices || globalSettings.chancePrices.length === 0}
                          >
                            {(globalSettings.chancePrices || []).map((config, index) => (
                              <option key={`${config.price}-${index}`} value={config.price}>
                                USD {config.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Este ajuste personal define a qué precio venderás los chances y cómo el sistema calculará sus premios según la tabla global configurada por el CEO.
                        </p>
                        {!canUpdatePersonalChancePrice && (
                          <p className="text-[10px] text-amber-400 leading-relaxed">
                            Este precio solo puede cambiarse antes de tu primera venta del día o después de haber sido liquidado.
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isUpdatingChancePrice || !canUpdatePersonalChancePrice || !globalSettings.chancePrices || globalSettings.chancePrices.length === 0}
                          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {isUpdatingChancePrice ? 'Actualizando...' : 'Guardar Precio de Chance'}
                        </button>
                      </form>
                    </div>

                    <div className="glass-card p-6 border-white/5 bg-white/[0.02] space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                          <BadgeDollarSign className="w-5 h-5" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest text-sm">Especial Chances 4D</h3>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preferencia personal</p>
                              <p className="mt-1 text-sm font-black text-white">{special4dSettings?.name || 'Especial Chances 4D'}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                              isSpecial4dGloballyEnabled
                                ? 'border-green-400/30 bg-green-500/15 text-green-300'
                                : 'border-amber-400/30 bg-amber-500/15 text-amber-300'
                            }`}>
                              {isSpecial4dGloballyEnabled ? 'Global activo' : 'Global inactivo'}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase text-muted-foreground">
                            <span>Cierre {special4dSettings?.closingTime || '--:--'}</span>
                            <span className="text-right">USD {(Number(special4dSettings?.unitPrice) || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={requestSpecial4dPreferenceChange}
                          disabled={isUpdatingSpecial4dPreference}
                          className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 ${
                            isSpecial4dUserEnabled
                              ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-500/25'
                              : 'bg-white/5 text-muted-foreground border border-white/10 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {isUpdatingSpecial4dPreference
                            ? 'Actualizando...'
                            : isSpecial4dUserEnabled
                              ? 'Especial 4D activado'
                              : 'Activar Especial 4D'}
                        </button>
                      </div>
                    </div>

                    {/* Seguridad */}
                    <div className="glass-card p-6 border-white/5 bg-white/[0.02] space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest text-sm">Seguridad</h3>
                      </div>

                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nueva Contraseña</label>
                          <input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                            placeholder="Mínimo 6 caracteres"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confirmar Contraseña</label>
                          <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                            placeholder="Repita la contraseña"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={isUpdatingPassword}
                          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {isUpdatingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </motion.div>
  );
}
