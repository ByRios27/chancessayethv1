import { LogOut, ShieldCheck } from 'lucide-react';
import { Toaster } from 'sonner';

import { useAppController } from '../../hooks/useAppController';
import Login from '../shared/Login';
import { AppMainContent } from './AppMainContent';
import { AppModals } from './AppModals';
import { AppSidebar } from './AppSidebar';

export function AppRoot() {
  const {
    loading,
    user,
    userProfile,
    handleLogoutFromUi,
    modalsProps,
    sidebarProps,
    mainContentProps,
  } = useAppController();

  return (
    <>
      <Toaster position="top-right" richColors duration={2000} />
      {loading || (user && userProfile === undefined) ? (
        <div key="loading" className="app-shell min-h-screen flex items-center justify-center font-mono">
          <span>CARGANDO SISTEMA...</span>
        </div>
      ) : !user ? (
        <Login key="login" />
      ) : !userProfile ? (
        <div key="access-denied" className="app-shell min-h-screen flex flex-col items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
            <ShieldCheck className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-black italic tracking-tighter">
              <span>ACCESO DENEGADO</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              <span>Tu cuenta ({user?.email}) no tiene permisos asignados en el sistema. Contacta al administrador.</span>
            </p>
            <button
              onClick={handleLogoutFromUi}
              className="w-full btn-secondary py-3 font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesion
            </button>
          </div>
        </div>
      ) : (
        <div className="app-shell min-h-screen text-foreground font-sans flex flex-col lg:flex-row overflow-hidden">
          <AppModals {...modalsProps} />
          <AppSidebar {...sidebarProps} />
          <AppMainContent {...mainContentProps} />
        </div>
      )}
    </>
  );
}
