import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, googleProvider, auth, db, doc, setDoc, getDoc, signOut } from '../../firebase';
import { AlertTriangle, ChevronRight, Lock, ShieldCheck, Ticket as TicketIcon, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import type { UserProfile } from '../../types/users';
import { getBusinessDate } from '../../utils/dates';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!username) {
      toast.error('Ingrese su correo para restablecer la contraseña');
      return;
    }
    const cleanUsername = username.trim().toLowerCase().replace(/\s/g, '');
    const email = username.includes('@') ? username.trim() : `${cleanUsername}@chancepro.local`;
    
    const toastId = toast.loading('Enviando correo de restablecimiento...');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Correo de restablecimiento enviado. Revise su bandeja de entrada.', { id: toastId });
    } catch (error: any) {
      console.error("Reset password failed", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
  };

  useEffect(() => {
    console.log("Login component mounted. Auth state:", auth.currentUser ? "Logged in" : "Logged out");
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleCredentialsLogin triggered", { username });
    
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
      
      console.log("Attempting auth with email:", email);
      
      console.log("Calling signInWithEmailAndPassword...");
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
      console.log("User signed in successfully:", userCredential.user.uid);
      localStorage.setItem('sessionBusinessDay', format(getBusinessDate(), 'yyyy-MM-dd'));
      
      toast.success('Sesión iniciada', { id: toastId });
    } catch (error: any) {
      console.error("Auth failed error details:", error);
      let errorMessage = "Credenciales incorrectas";
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Credenciales incorrectas (usuario o contraseña no coinciden). Si olvidó su clave, use el botón de recuperar.";
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <motion.div 
        key="login-form-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-card p-8 sm:p-10 relative z-10 neon-border"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/30">
            <TicketIcon className="w-8 h-8 text-primary neon-text" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase neon-text">
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
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-xl font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
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
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-xl font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={handleResetPassword}
              className="text-[10px] font-mono uppercase tracking-widest text-primary hover:underline"
            >
              <span>¿Olvidó su contraseña?</span>
            </button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="w-full bg-white/5 border border-white/15 text-foreground py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Iniciar con Google
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
