import React from 'react';
import { motion } from 'motion/react';
import { Lock, Ticket as TicketIcon } from 'lucide-react';

type ConfigSectionProps = any;

export function ConfigSection(props: ConfigSectionProps) {
  const {
    handleUpdateChancePrice,
    personalChancePrice,
    setPersonalChancePrice,
    globalSettings,
    canUpdatePersonalChancePrice,
    isUpdatingChancePrice,
    handleUpdatePassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isUpdatingPassword,
  } = props;

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
                      <h2 className="text-2xl font-black italic tracking-tighter neon-text uppercase">CONFIGURACIÃ“N</h2>
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
                            disabled={!globalSettings.chancePrices || globalSettings.chancePrices.length === 0}
                          >
                            {(globalSettings.chancePrices || []).map((config, index) => (
                              <option key={`${config.price}-${index}`} value={config.price}>
                                USD {config.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Este ajuste personal define a quÃ© precio venderÃ¡s los chances y cÃ³mo el sistema calcularÃ¡ sus premios segÃºn la tabla global configurada por el CEO.
                        </p>
                        {!canUpdatePersonalChancePrice && (
                          <p className="text-[10px] text-amber-400 leading-relaxed">
                            Este precio solo puede cambiarse antes de tu primera venta del dÃ­a o despuÃ©s de haber sido liquidado.
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
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nueva ContraseÃ±a</label>
                          <input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                            placeholder="MÃ­nimo 6 caracteres"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confirmar ContraseÃ±a</label>
                          <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                            placeholder="Repita la contraseÃ±a"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={isUpdatingPassword}
                          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {isUpdatingPassword ? 'Actualizando...' : 'Cambiar ContraseÃ±a'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </motion.div>
  );
}
