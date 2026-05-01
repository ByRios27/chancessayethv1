import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { UserProfile } from '../../types/users';

const UserModal = ({ show, userProfile, onSave, onClose, currentUserRole, isSaving = false }: {
  show: boolean;
  userProfile: UserProfile | null;
  onSave: (user: UserProfile, password?: string) => void | Promise<void>;
  onClose: () => void;
  currentUserRole: string | undefined;
  isSaving?: boolean;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'seller' | 'ceo'>('seller');
  const [commissionRateInput, setCommissionRateInput] = useState('10');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [canLiquidate, setCanLiquidate] = useState(false);
  const [sellerId, setSellerId] = useState('');

  useEffect(() => {
    if (userProfile) {
      setEmail(userProfile.email);
      setPassword('');
      setName(userProfile.name);
      setRole(userProfile?.role as 'admin' | 'seller' | 'ceo');
      setCommissionRateInput(String(userProfile.commissionRate ?? 0));
      setStatus(userProfile.status);
      setCanLiquidate(userProfile.canLiquidate || false);
      setSellerId(userProfile.sellerId || '');
    } else {
      setEmail('');
      setPassword('');
      setName('');
      setRole('seller');
      setCommissionRateInput('10');
      setStatus('active');
      setCanLiquidate(false);
      setSellerId('');
    }
  }, [userProfile, show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-3 md:p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black uppercase tracking-wide">{userProfile ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Usuario (sin espacios)</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s/g, ''))}
              disabled={!!userProfile}
              placeholder="ej. juanperez"
              className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all disabled:opacity-50"
            />
          </div>

          {!userProfile && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Contrasena (opcional si ya existe en Auth)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all"
              />
            </div>
          )}

          {!userProfile && (
            <div className="p-2.5 bg-primary/15 border border-primary/30 rounded-xl">
              <p className="text-[11px] text-blue-300 font-mono uppercase tracking-wide text-center">
                El ID de vendedor y el nombre se generan automaticamente al guardar.
              </p>
            </div>
          )}

          {userProfile && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">ID Vendedor (Prefijo)</label>
                <input
                  type="text"
                  value={sellerId}
                  readOnly
                  className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm opacity-60 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Nombre</label>
                <input
                  type="text"
                  value={name}
                  readOnly
                  className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm opacity-60 cursor-not-allowed"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'seller' | 'ceo')}
              disabled={currentUserRole !== 'ceo' && currentUserRole !== 'admin'}
              className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all disabled:opacity-50"
            >
              <option key="seller" value="seller" className="bg-slate-900">Vendedor</option>
              {currentUserRole === 'ceo' && <option key="admin" value="admin" className="bg-slate-900">Administrador</option>}
              {currentUserRole === 'ceo' && <option key="ceo" value="ceo" className="bg-slate-900">CEO</option>}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Comision (%)</label>
            <input
              type="number"
              value={commissionRateInput}
              onChange={(e) => setCommissionRateInput(e.target.value)}
              min="0"
              max="100"
              disabled={currentUserRole !== 'ceo'}
              className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="h-11 w-full bg-white/[0.04] border border-white/10 px-3 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/70 transition-all"
            >
              <option key="active" value="active" className="bg-slate-900">Activo</option>
              <option key="inactive" value="inactive" className="bg-slate-900">Inactivo</option>
            </select>
          </div>

          {currentUserRole === 'ceo' && role === 'admin' && (
            <div className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl border border-white/10 mt-2">
              <input
                type="checkbox"
                id="canLiquidate"
                checked={canLiquidate}
                onChange={(e) => setCanLiquidate(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <label htmlFor="canLiquidate" className="text-xs font-bold uppercase tracking-wider cursor-pointer">
                Permitir Liquidar a Otros
              </label>
            </div>
          )}

          <button
            onClick={() => {
              if (isSaving) return;
              if (!email) {
                toast.error('Usuario es requerido');
                return;
              }
              const normalizedCommissionRate = commissionRateInput.trim() === ''
                ? 0
                : Number.parseFloat(commissionRateInput);
              if (!Number.isFinite(normalizedCommissionRate) || normalizedCommissionRate < 0) {
                toast.error('Comision invalida');
                return;
              }
              if (!userProfile && password && password.length < 6) {
                toast.error('La contrasena debe tener al menos 6 caracteres');
                return;
              }
              onSave({
                email,
                name: userProfile ? name : '',
                role,
                commissionRate: normalizedCommissionRate,
                status,
                canLiquidate: role === 'admin' ? canLiquidate : false,
                currentDebt: userProfile?.currentDebt || 0,
                sellerId,
              }, password);
            }}
            disabled={isSaving}
            className="h-11 w-full bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-wide hover:bg-blue-400 transition-all mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : userProfile ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UserModal;
