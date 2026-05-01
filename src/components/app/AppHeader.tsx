import { LogOut, Menu } from 'lucide-react';

interface AppHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  todayStats: {
    sales: number;
    commissions: number;
    prizes: number;
    netProfit: number;
  };
  handleLogoutFromUi: () => void;
}

export function AppHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  todayStats,
  handleLogoutFromUi,
}: AppHeaderProps) {
  return (
    <header className="h-16 surface-dark border-b border-border px-3 flex items-center justify-between shrink-0 gap-2">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-2 surface-soft rounded-lg text-muted-foreground shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-around md:justify-center md:gap-12">
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Ventas</span>
          <span className="text-xs font-black text-white">${todayStats.sales.toFixed(2)}</span>
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Comisión</span>
          <span className="text-xs font-black text-primary">${todayStats.commissions.toFixed(2)}</span>
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Premios</span>
          <span className="text-xs font-black text-red-400">${todayStats.prizes.toFixed(2)}</span>
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Balance</span>
          <span className={`text-xs font-black ${todayStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${todayStats.netProfit.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleLogoutFromUi}
          className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
