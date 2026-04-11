import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface InjectionData {
  sellerCode: string;
  sales: number;
  prizes: number;
  utilidad: number;
  inyeccionRequerida: number;
}

interface InyeccionesRequeridasProps {
  injections: InjectionData[];
}

export const InyeccionesRequeridas: React.FC<InyeccionesRequeridasProps> = ({ injections }) => {
  if (injections.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Inyecciones Requeridas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {injections.map((inj) => (
          <div key={inj.sellerCode} className="glass-card p-4 border-red-500/20 bg-red-500/5 rounded-xl shadow-md">
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg font-bold text-white">{inj.sellerCode}</span>
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full uppercase">Alerta</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">Ventas: <span className="text-white font-bold">${inj.sales.toFixed(2)}</span></div>
              <div className="text-gray-400">Premios: <span className="text-white font-bold">${inj.prizes.toFixed(2)}</span></div>
              <div className="text-gray-400">Utilidad: <span className="text-red-400 font-bold">${inj.utilidad.toFixed(2)}</span></div>
              <div className="text-gray-400">Inyección: <span className="text-white font-bold">${inj.inyeccionRequerida.toFixed(2)}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
