import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { UserProfile } from '../../types/users';

const UserModal = ({ show, userProfile, onSave, onClose, currentUserRole, canCreateProgramador = false }: {
  show: boolean;
  userProfile: UserProfile | null;
  onSave: (user: UserProfile, password?: string) => void;
  onClose: () => void;
  currentUserRole: string | undefined;
  canCreateProgramador?: boolean;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'seller' | 'ceo' | 'programador'>('seller');
  const [commissionRate, setCommissionRate] = useState(10);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [canLiquidate, setCanLiquidate] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [sellerId, setSellerId] = useState('');

  useEffect(() => {
    if (userProfile) {
      setEmail(userProfile.email);
      setPassword('');
      setName(userProfile.name);
      setRole(userProfile?.role as 'admin' | 'seller' | 'ceo' | 'programador');
      setCommissionRate(userProfile.commissionRate);
      setStatus(userProfile.status);
      setCanLiquidate(userProfile.canLiquidate || false);
      setSessionTimeoutMinutes(userProfile.sessionTimeoutMinutes || 60);
      setSellerId(userProfile.sellerId || '');
    } else {
      setEmail('');
      setPassword('');
      setName('');
      setRole('seller');
      setCommissionRate(10);
      setStatus('active');
      setCanLiquidate(false);
      setSessionTimeoutMinutes(60);
      setSellerId('');
    }
  }, [userProfile, show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-4 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">{userProfile ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Usuario (sin espacios)</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ''))}
              disabled={!!userProfile}
              placeholder="ej. juanperez"
              className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
            />
          </div>

          {!userProfile && (
            <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Contraseña (opcional si ya existe en Auth)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          )}

          {!userProfile && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <p className="text-xs text-primary font-mono uppercase tracking-widest text-center">
                El ID de Vendedor y el Nombre se generarán automáticamente al guardar.
              </p>
            </div>
          )}

          {userProfile && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">ID Vendedor (Prefijo)</label>
                <input 
                  type="text" 
                  value={sellerId}
                  readOnly
                  className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm opacity-50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Nombre</label>
                <input 
                  type="text" 
                  value={name}
                  readOnly
                  className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm opacity-50 cursor-not-allowed"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Rol</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'seller' | 'ceo' | 'programador')}
              disabled={currentUserRole !== 'ceo' && currentUserRole !== 'admin' && currentUserRole !== 'programador'}
              className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
            >
              <option key="seller" value="seller" className="bg-gray-900">Vendedor</option>
              {(currentUserRole === 'ceo' || currentUserRole === 'admin') && <option key="admin" value="admin" className="bg-gray-900">Administrador</option>}
              {currentUserRole === 'ceo' && <option key="ceo" value="ceo" className="bg-gray-900">CEO</option>}
              {canCreateProgramador && <option key="programador" value="programador" className="bg-gray-900">Programador</option>}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Comisión (%)</label>
            <input 
              type="number" 
              value={Number.isNaN(commissionRate) ? '' : commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              min="0"
              max="100"
              disabled={currentUserRole !== 'ceo'}
              className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Estado</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full bg-black border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option key="active" value="active" className="bg-gray-900">Activo</option>
              <option key="inactive" value="inactive" className="bg-gray-900">Inactivo</option>
            </select>
          </div>

          {currentUserRole === 'ceo' && role === 'admin' && (
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-border mt-4">
              <input 
                type="checkbox" 
                id="canLiquidate"
                checked={canLiquidate}
                onChange={(e) => setCanLiquidate(e.target.checked)}
                className="w-5 h-5 rounded border-border bg-black text-primary focus:ring-primary focus:ring-offset-0"
              />
              <label htmlFor="canLiquidate" className="text-sm font-bold uppercase tracking-widest cursor-pointer">
                Permitir Liquidar a Otros
              </label>
            </div>
          )}

          {role === 'ceo' && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tiempo de inactividad (minutos)</label>
              <input 
                type="number" 
                value={Number.isNaN(sessionTimeoutMinutes) ? '' : sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                min="1"
                className="w-full bg-white/5 border border-border p-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          )}

          <button 
            onClick={() => {
              if (!email) {
                toast.error('Usuario es requerido');
                return;
              }
              if (!userProfile && password && password.length < 6) {
                toast.error('La contraseña debe tener al menos 6 caracteres');
                return;
              }
              onSave({ 
                email, 
                name: userProfile ? name : '', // Will be generated in saveUser
                role, 
                commissionRate, 
                status,
                canLiquidate: role === 'admin' ? canLiquidate : false,
                currentDebt: userProfile?.currentDebt || 0,
                sessionTimeoutMinutes: role === 'ceo' ? sessionTimeoutMinutes : undefined,
                sellerId
              }, password);
            }}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase tracking-widest hover:brightness-110 transition-all mt-6"
          >
            {userProfile ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UserModal;
