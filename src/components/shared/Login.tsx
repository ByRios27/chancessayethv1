import React, { useState } from 'react';
import { toast } from 'sonner';
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, googleProvider, auth, db, doc, getDoc, signOut } from '../../firebase';
import { ChevronRight, Lock, Ticket as TicketIcon, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import type { UserProfile } from '../../types/users';
import { getBusinessDate } from '../../utils/dates';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Ingrese usuario y contraseña');
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Iniciando sesión...');
    
    try {
      if (!auth) {
        throw new Error("Firebase Auth no está inicializado");
      }

      const cleanUsername = username.trim().toLowerCase().replace(/\s/g, '');
      let email = username.includes('@') ? username.trim() : `${cleanUsername}@chancepro.local`;
      
      const ceoEmail = import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com';
      const ceoUsername = ceoEmail.split('@')[0];

      // Prevent CEO from accidentally using local domain
      if (cleanUsername === ceoUsername && !username.includes('@')) {
        email = ceoEmail;
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const signedInEmail = (userCredential.user.email || email).toLowerCase();

      // Validate active/inactive only on explicit credential login.
      if (signedInEmail !== ceoEmail.toLowerCase()) {
        const userDoc = await getDoc(doc(db, 'users', signedInEmail));
        if (!userDoc.exists()) {
          await signOut(auth);
          localStorage.removeItem('sessionBusinessDay');
          toast.error('Tu usuario no existe en la base de datos.');
          return;
        }

        const profile = userDoc.data() as UserProfile;
        if ((profile.status || 'active') !== 'active') {
          await signOut(auth);
          localStorage.removeItem('sessionBusinessDay');
          toast.error('Tu usuario está inactivo. Contacta al administrador.');
          return;
        }
      }
      localStorage.setItem('sessionBusinessDay', format(getBusinessDate(), 'yyyy-MM-dd'));
      
      toast.success('Sesión iniciada', { id: toastId });
    } catch (error: any) {
      console.error("Auth failed error details:", error);
      let errorMessage = "Credenciales incorrectas";
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Credenciales incorrectas (usuario o contraseña no coinciden). Contacte al CEO o admin para actualizar su clave.";
        if (!username.includes('@')) {
          errorMessage += ". Verifique si debe usar su correo completo (ej: @gmail.com)";
        }
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El formato del correo no es válido";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Error de red. Verifique su conexión a internet.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "El inicio de sesión con correo/contraseña no está habilitado en Firebase";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const toastId = toast.loading('Iniciando sesion con Google...');

    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth de Google no esta inicializado.');
      }
      const ceoEmail = (import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com').toLowerCase();
      const userCredential = await signInWithPopup(auth, googleProvider);
      const signedInEmail = (userCredential.user.email || '').toLowerCase();

      if (!signedInEmail) {
        await signOut(auth);
        localStorage.removeItem('sessionBusinessDay');
        toast.error('La cuenta de Google no tiene correo valido.', { id: toastId });
        return;
      }

      if (signedInEmail !== ceoEmail) {
        const userDoc = await getDoc(doc(db, 'users', signedInEmail));
        if (!userDoc.exists()) {
          await signOut(auth);
          localStorage.removeItem('sessionBusinessDay');
          toast.error('Tu usuario no existe en la base de datos.', { id: toastId });
          return;
        }

        const profile = userDoc.data() as UserProfile;
        if ((profile.status || 'active') !== 'active') {
          await signOut(auth);
          localStorage.removeItem('sessionBusinessDay');
          toast.error('Tu usuario esta inactivo. Contacta al administrador.', { id: toastId });
          return;
        }
      }

      localStorage.setItem('sessionBusinessDay', format(getBusinessDate(), 'yyyy-MM-dd'));
      toast.success('Sesion iniciada con Google', { id: toastId });
    } catch (error: any) {
      if (error?.code === 'auth/argument-error') {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      let errorMessage = 'No se pudo iniciar sesion con Google';

      if (error?.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Se cerro la ventana de Google antes de completar el inicio de sesion.';
      } else if (error?.code === 'auth/popup-blocked') {
        errorMessage = 'El navegador bloqueo la ventana emergente de Google.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Error de red. Verifique su conexion a internet.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-8%] left-[-8%] w-[38%] h-[38%] bg-primary/15 rounded-full blur-[64px]" />
      <div className="absolute bottom-[-8%] right-[-8%] w-[38%] h-[38%] bg-primary/10 rounded-full blur-[64px]" />

      <motion.div 
        key="login-form-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full surface-panel p-6 sm:p-8 relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-3 border border-primary/30">
            <TicketIcon className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase text-white">
            <span>Chance Pro</span>
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mt-2">
            <span>Sistema de Gestión v1.0.0</span>
          </p>
        </div>
        
        <form onSubmit={handleCredentialsLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">
              <span>Usuario / Email</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-surface w-full p-4 pl-12 font-mono text-sm placeholder:text-muted-foreground/40"
                placeholder="vendedor01"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">
              <span>Contraseña</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-surface w-full p-4 pl-12 font-mono text-sm placeholder:text-muted-foreground/40"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><span>Ingresar al Sistema</span> <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-secondary w-full py-4 font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
          >
            Iniciar con Google
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
