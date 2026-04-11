import React from 'react';
import { LayoutDashboard, History, Plus, Settings, Printer } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  role: string | undefined;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, role }) => {
  const tabs = [
    { name: 'sales', icon: Plus, label: 'Venta' },
    { name: 'history', icon: History, label: 'Historial' },
    { name: 'cierres', icon: Printer, label: 'Cierres' },
  ];

  if (role === 'ceo' || role === 'admin') {
    tabs.push({ name: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' });
  }
  tabs.push({ name: 'config', icon: Settings, label: 'Config' });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around items-center p-2 pb-safe z-50">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          onClick={() => setActiveTab(tab.name)}
          className={`flex flex-col items-center p-2 rounded-lg ${activeTab === tab.name ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <tab.icon className="w-6 h-6" />
          <span className="text-[10px] mt-1">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
