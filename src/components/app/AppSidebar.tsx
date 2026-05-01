import { Cloud, CloudOff, LogOut, Ticket as TicketIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import type { NavItem } from '../../config/navigation';
import type { AppTabId } from '../../hooks/useAppDataScopes';

interface AppSidebarProps {
  isMobile: boolean;
  isOnline: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeTab: AppTabId;
  setActiveTab: (tab: AppTabId) => void;
  visibleNavigationItems: NavItem[];
  handleLogoutFromUi: () => void;
}

export function AppSidebar({
  isMobile,
  isOnline,
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  visibleNavigationItems,
  handleLogoutFromUi,
}: AppSidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] z-40"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? (isSidebarOpen ? 280 : 0) : (isSidebarOpen ? 280 : 80),
          x: isMobile && !isSidebarOpen ? -280 : 0,
        }}
        className={`surface-dark border-r border-border h-screen flex flex-col overflow-hidden z-50 ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'}`}
      >
        <div className="px-4 py-4 flex items-center gap-3 shrink-0">
          <div className="bg-primary p-2 rounded-lg neon-border">
            <TicketIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          {isSidebarOpen && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-black italic tracking-tighter neon-text"
            >
              CHANCE PRO
            </motion.h1>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] custom-scrollbar">
          <nav className="space-y-1.5">
            {visibleNavigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full h-11 px-3 rounded-lg border flex items-center gap-2.5 transition-all ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && (
                  <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/10 transition-all ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOnline ? <Cloud className="w-4 h-4 flex-shrink-0" /> : <CloudOff className="w-4 h-4 flex-shrink-0" />}
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none whitespace-nowrap truncate">
                    {isOnline ? 'Sincronizado' : 'Sin Conexión'}
                  </span>
                  <span className="text-[9px] font-mono opacity-60 uppercase leading-none mt-0.5 whitespace-nowrap truncate">
                    {isOnline ? 'Nube Activa' : 'Modo Local'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogoutFromUi}
              className="w-full h-11 px-3 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-400/10 flex items-center gap-2.5 transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {isSidebarOpen && (
                <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap truncate">
                  Cerrar Sesión
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
